package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.*;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SaasPharmacyService {

    private final SaasPharmacySaleRepository saleRepository;
    private final SaasPharmacySaleItemRepository saleItemRepository;
    private final SaasMedicineRepository medicineRepository;
    private final SaasMedicineStockRepository stockRepository;
    private final SaasPatientRepository patientRepository;
    private final SaasBillingService billingService;
    private final SaasInventoryService inventoryService;
    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;

    public SaasPharmacyService(
            SaasPharmacySaleRepository saleRepository,
            SaasPharmacySaleItemRepository saleItemRepository,
            SaasMedicineRepository medicineRepository,
            SaasMedicineStockRepository stockRepository,
            SaasPatientRepository patientRepository,
            SaasBillingService billingService,
            SaasInventoryService inventoryService,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.medicineRepository = medicineRepository;
        this.stockRepository = stockRepository;
        this.patientRepository = patientRepository;
        this.billingService = billingService;
        this.inventoryService = inventoryService;
        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
    }

    @Transactional
    public SaasPharmacySaleResponse createSale(SaasPharmacySaleRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.PHARMACY,
    	        SaasPermissionAction.CREATE
    	);

        validateSaleRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        BigDecimal subtotal = calculateSubtotal(request);
        BigDecimal discount = request.getDiscountAmount() == null ? BigDecimal.ZERO : request.getDiscountAmount();
        BigDecimal tax = request.getTaxAmount() == null ? BigDecimal.ZERO : request.getTaxAmount();
        BigDecimal total = subtotal.subtract(discount).add(tax);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO;
        }

        BigDecimal paid = request.getPaidAmount() == null ? BigDecimal.ZERO : request.getPaidAmount();

        if (paid.compareTo(total) > 0) {
            paid = total;
        }

        BigDecimal due = total.subtract(paid);

        SaasPharmacySale sale = new SaasPharmacySale();
        sale.setTenantId(request.getTenantId());
        sale.setPatientId(patient.getId());
        sale.setSubtotal(subtotal);
        sale.setDiscountAmount(discount);
        sale.setTaxAmount(tax);
        sale.setTotalAmount(total);
        sale.setPaidAmount(paid);
        sale.setDueAmount(due);
        sale.setStatus(SaasPharmacySaleStatus.COMPLETED);
        sale.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        sale.setActive(true);

        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            sale.setPaymentStatus(SaasPaymentStatus.UNPAID);
        } else if (paid.compareTo(total) < 0) {
            sale.setPaymentStatus(SaasPaymentStatus.PARTIAL);
        } else {
            sale.setPaymentStatus(SaasPaymentStatus.PAID);
        }

        if (request.getPaymentMode() != null && !request.getPaymentMode().isBlank()) {
            sale.setPaymentMode(SaasPaymentMode.valueOf(request.getPaymentMode().toUpperCase()));
        }

        SaasPharmacySale savedSale = saleRepository.save(sale);

        savedSale.setSaleNumber(generateSaleNumber(savedSale));
        savedSale = saleRepository.save(savedSale);

        saveSaleItemsAndReduceStock(savedSale, request.getItems());

        SaasInvoiceResponse invoice = createPharmacyInvoice(savedSale, request);

        savedSale.setInvoiceId(invoice.getId());
        savedSale.touch();

        savedSale = saleRepository.save(savedSale);

        return toResponse(savedSale);
    }

    public List<SaasPharmacySaleResponse> getSales(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PHARMACY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return saleRepository
                .findByTenantIdAndActiveTrueOrderBySaleDateTimeDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasPharmacySaleResponse> getPatientSales(Long tenantId, Long patientId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PHARMACY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return saleRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderBySaleDateTimeDesc(tenantId, patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasPharmacySaleResponse getSale(Long tenantId, Long saleId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PHARMACY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasPharmacySale sale = saleRepository
                .findByIdAndTenantIdAndActiveTrue(saleId, tenantId)
                .orElseThrow(() -> new RuntimeException("Sale not found"));

        return toResponse(sale);
    }

    private BigDecimal calculateSubtotal(SaasPharmacySaleRequest request) {

        BigDecimal subtotal = BigDecimal.ZERO;

        for (SaasPharmacySaleItemRequest item : request.getItems()) {

            SaasMedicineStock stock = stockRepository
                    .findByIdAndTenantIdAndActiveTrue(item.getStockId(), request.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Stock not found"));

            int qty = item.getQuantity() == null ? 0 : item.getQuantity();

            if (qty <= 0) {
                throw new RuntimeException("Invalid sale quantity");
            }

            if (stock.getCurrentQuantity() == null || stock.getCurrentQuantity() < qty) {
                throw new RuntimeException("Insufficient stock for batch: " + stock.getBatchNumber());
            }

            BigDecimal salePrice = stock.getSalePrice() == null ? BigDecimal.ZERO : stock.getSalePrice();

            subtotal = subtotal.add(salePrice.multiply(BigDecimal.valueOf(qty)));
        }

        return subtotal;
    }

    private void saveSaleItemsAndReduceStock(
            SaasPharmacySale sale,
            List<SaasPharmacySaleItemRequest> items
    ) {
        for (SaasPharmacySaleItemRequest item : items) {

            SaasMedicine medicine = medicineRepository
                    .findByIdAndTenantIdAndActiveTrue(item.getMedicineId(), sale.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Medicine not found"));

            SaasMedicineStock stock = stockRepository
                    .findByIdAndTenantIdAndActiveTrue(item.getStockId(), sale.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Stock not found"));

            int qty = item.getQuantity() == null ? 0 : item.getQuantity();

            if (qty <= 0) {
                throw new RuntimeException("Invalid quantity");
            }

            if (stock.getCurrentQuantity() == null || stock.getCurrentQuantity() < qty) {
                throw new RuntimeException("Insufficient stock for " + medicine.getMedicineName());
            }

            BigDecimal salePrice = stock.getSalePrice() == null ? BigDecimal.ZERO : stock.getSalePrice();
            BigDecimal totalPrice = salePrice.multiply(BigDecimal.valueOf(qty));

            SaasPharmacySaleItem saleItem = new SaasPharmacySaleItem();
            saleItem.setTenantId(sale.getTenantId());
            saleItem.setSaleId(sale.getId());
            saleItem.setMedicineId(medicine.getId());
            saleItem.setStockId(stock.getId());
            saleItem.setMedicineName(medicine.getMedicineName());
            saleItem.setBatchNumber(stock.getBatchNumber());
            saleItem.setQuantity(qty);
            saleItem.setSalePrice(salePrice);
            saleItem.setTotalPrice(totalPrice);

            saleItemRepository.save(saleItem);

            stock.setCurrentQuantity(stock.getCurrentQuantity() - qty);
            stock.touch();
            stockRepository.save(stock);

            inventoryService.createMovement(
                    sale.getTenantId(),
                    medicine.getId(),
                    stock.getId(),
                    SaasStockMovementType.SALE,
                    qty,
                    "Medicine sale",
                    sale.getId()
            );
        }
    }

    private SaasInvoiceResponse createPharmacyInvoice(
            SaasPharmacySale sale,
            SaasPharmacySaleRequest request
    ) {
        List<SaasInvoiceItemRequest> invoiceItems = saleItemRepository
                .findByTenantIdAndSaleIdOrderByIdAsc(sale.getTenantId(), sale.getId())
                .stream()
                .map(item -> {
                    SaasInvoiceItemRequest invoiceItem = new SaasInvoiceItemRequest();
                    invoiceItem.setItemName(item.getMedicineName() + " - Batch " + item.getBatchNumber());
                    invoiceItem.setItemType("PHARMACY");
                    invoiceItem.setQuantity(item.getQuantity());
                    invoiceItem.setUnitPrice(item.getSalePrice());
                    return invoiceItem;
                })
                .toList();

        SaasInvoiceRequest invoiceRequest = new SaasInvoiceRequest();
        invoiceRequest.setTenantId(sale.getTenantId());
        invoiceRequest.setPatientId(sale.getPatientId());
        invoiceRequest.setInvoiceType("PHARMACY");
        invoiceRequest.setDiscountAmount(sale.getDiscountAmount());
        invoiceRequest.setTaxAmount(sale.getTaxAmount());
        invoiceRequest.setPaidAmount(sale.getPaidAmount());
        invoiceRequest.setPaymentMode(sale.getPaymentMode() == null ? null : sale.getPaymentMode().name());
        invoiceRequest.setTransactionId(null);
        invoiceRequest.setNotes("Pharmacy sale invoice: " + sale.getSaleNumber());
        invoiceRequest.setItems(invoiceItems);

        return billingService.createInvoice(invoiceRequest);
    }

    private void validateSaleRequest(SaasPharmacySaleRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getPatientId() == null) {
            throw new RuntimeException("patientId is required");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Sale items are required");
        }
    }

    private String generateSaleNumber(SaasPharmacySale sale) {
        return "SALE-" + sale.getTenantId() + "-" + String.format("%05d", sale.getId());
    }

    private SaasPharmacySaleResponse toResponse(SaasPharmacySale sale) {

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(sale.getPatientId(), sale.getTenantId())
                .orElse(null);

        List<SaasPharmacySaleItemResponse> items =
                saleItemRepository
                        .findByTenantIdAndSaleIdOrderByIdAsc(sale.getTenantId(), sale.getId())
                        .stream()
                        .map(item -> new SaasPharmacySaleItemResponse(
                                item.getId(),
                                item.getMedicineId(),
                                item.getStockId(),
                                item.getMedicineName(),
                                item.getBatchNumber(),
                                item.getQuantity(),
                                item.getSalePrice(),
                                item.getTotalPrice()
                        ))
                        .toList();

        return new SaasPharmacySaleResponse(
                sale.getId(),
                sale.getTenantId(),
                sale.getSaleNumber(),
                sale.getPatientId(),
                patient == null ? null : patient.getPatientName(),
                patient == null ? null : patient.getMobile(),
                sale.getInvoiceId(),
                sale.getSubtotal(),
                sale.getDiscountAmount(),
                sale.getTaxAmount(),
                sale.getTotalAmount(),
                sale.getPaidAmount(),
                sale.getDueAmount(),
                sale.getPaymentStatus().name(),
                sale.getPaymentMode() == null ? null : sale.getPaymentMode().name(),
                sale.getStatus().name(),
                sale.getSaleDateTime(),
                items
        );
    }
}