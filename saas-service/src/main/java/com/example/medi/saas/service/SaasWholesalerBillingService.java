package com.example.medi.saas.service;

import com.example.medi.saas.client.MedicineServiceClient;
import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.*;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class SaasWholesalerBillingService {

	private final SaasSaleRepository saleRepository;
	private final SaasSaleItemRepository saleItemRepository;
	private final SaasSaleStockAllocationRepository allocationRepository;

	private final SaasMedicineStockRepository stockRepository;
	private final SaasCustomerRepository customerRepository;

	private final SaasInvoiceRepository invoiceRepository;
	private final SaasInvoiceItemRepository invoiceItemRepository;
	private final SaasPaymentReceiptRepository paymentReceiptRepository;

	private final MedicineServiceClient medicineServiceClient;

	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasNotificationService notificationService;

	private final SaasBillingService billingService;

	@Value("${internal.service.key}")
	private String internalServiceKey;

	private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

	private static final BigDecimal HUNDRED = new BigDecimal("100");

	private BigDecimal money(BigDecimal value) {

		if (value == null) {
			return ZERO;
		}

		return value.setScale(2, RoundingMode.HALF_UP);
	}

	private Integer qty(Integer value) {

		if (value == null) {
			return 0;
		}

		return Math.max(value, 0);
	}

	private String authorizationHeader() {

		String token = CurrentUserUtil.getToken();

		if (token == null || token.isBlank()) {
			throw new RuntimeException("JWT token not found");
		}

		if (token.startsWith("Bearer ")) {
			return token;
		}

		return "Bearer " + token;
	}

	private Long currentUserId() {

		Long id = CurrentUserUtil.getUserId();

		if (id == null) {
			throw new RuntimeException("Current user not found");
		}

		return id;
	}

	private String nextSaleNumber(Long tenantId) {

		long count = saleRepository.countByTenantIdAndSaleStatusNot(tenantId, SaasSaleStatus.CANCELLED);

		return String.format("SAL-%06d", count + 1);
	}

	

	private void validateRequest(SaasSaleRequest request) {

		if (request == null) {
			throw new RuntimeException("Request is required.");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("Tenant is required.");
		}

		if (request.getCustomerId() == null) {
			throw new RuntimeException("Customer is required.");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("At least one medicine is required.");
		}
	}

	private SaasCustomer loadCustomer(Long tenantId, Long customerId) {

		return customerRepository.findByIdAndTenantId(customerId, tenantId)
				.orElseThrow(() -> new RuntimeException("Customer not found."));
	}

	private GlobalMedicineResponse loadMedicine(Long medicineId) {

		return medicineServiceClient.getMedicine(

				authorizationHeader(),

				internalServiceKey,

				medicineId);
	}

	public SaasSaleResponse createSale(SaasSaleRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.CREATE);

		SaasCustomer customer = loadCustomer(tenantId, request.getCustomerId());

		SaasSale sale = new SaasSale();

		sale.setTenantId(tenantId);

		sale.setSaleNumber(nextSaleNumber(tenantId));

		sale.setSaleDate(request.getSaleDate() == null ? LocalDate.now() : request.getSaleDate());

		sale.setCustomerId(customer.getId());

		sale.setCustomerCode(customer.getCustomerCode());

		sale.setCustomerName(customer.getCustomerName());

		sale.setCustomerType(customer.getCustomerType());

		sale.setCustomerGstin(customer.getGstin());

		sale.setRemarks(request.getRemarks());

		sale.setPaymentMode(request.getPaymentMode());

		sale.setOtherCharges(money(request.getOtherCharges()));

		sale.setRoundOffAmount(money(request.getRoundOffAmount()));

		sale.setCreatedByAuthUserId(currentUserId());

		sale.setGrossAmount(ZERO);
		sale.setDiscountAmount(ZERO);
		sale.setTaxableAmount(ZERO);
		sale.setGstAmount(ZERO);
		sale.setGrandTotal(ZERO);
		sale.setPaidAmount(ZERO);
		sale.setDueAmount(ZERO);
		sale.setTotalQuantity(0);

		sale = saleRepository.save(sale);

		BigDecimal grossAmount = ZERO;
		BigDecimal discountAmount = ZERO;
		BigDecimal taxableAmount = ZERO;
		BigDecimal gstAmount = ZERO;

		int totalQuantity = 0;

		List<SaasSaleItem> savedItems = new ArrayList<>();
		for (SaasSaleItemRequest itemRequest : request.getItems()) {

			if (itemRequest.getMedicineId() == null) {
				throw new RuntimeException("Medicine is required.");
			}

			if (qty(itemRequest.getQuantity()) <= 0) {
				throw new RuntimeException("Invalid quantity.");
			}

			if (itemRequest.getSaleRate() == null || itemRequest.getSaleRate().compareTo(BigDecimal.ZERO) <= 0) {

				throw new RuntimeException("Invalid sale rate.");
			}

			
			GlobalMedicineResponse medicine = loadMedicine(itemRequest.getMedicineId());

			Long availableQty = stockRepository.sumAvailableQuantityForSale(

					tenantId,

					medicine.getId(),

					LocalDate.now());

			if (availableQty == null) {
				availableQty = 0L;
			}

			if (availableQty < itemRequest.getQuantity()) {

				throw new RuntimeException(

						medicine.getMedicineName() + " stock not available.");
			}

			BigDecimal saleRate = money(itemRequest.getSaleRate());

			BigDecimal discountPercentage = money(itemRequest.getDiscountPercentage());

			BigDecimal gstPercentage = money(itemRequest.getGstPercentage());

			BigDecimal gross = saleRate.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

			BigDecimal discount = gross.multiply(discountPercentage).divide(HUNDRED, 2, RoundingMode.HALF_UP);

			BigDecimal taxable = gross.subtract(discount);

			BigDecimal gst = taxable.multiply(gstPercentage).divide(HUNDRED, 2, RoundingMode.HALF_UP);

			BigDecimal lineTotal = taxable.add(gst);

			SaasSaleItem saleItem = new SaasSaleItem();

			saleItem.setTenantId(tenantId);

			saleItem.setSaleId(sale.getId());

			saleItem.setMedicineId(medicine.getId());

			saleItem.setMedicineName(medicine.getMedicineName());

			saleItem.setMedicineType(medicine.getMedicineType());

			saleItem.setManufacturer(medicine.getManufacturer());

			saleItem.setQuantity(itemRequest.getQuantity());

			saleItem.setSaleRate(saleRate);

			saleItem.setGrossAmount(gross);

			saleItem.setDiscountPercentage(discountPercentage);

			saleItem.setDiscountAmount(discount);

			saleItem.setTaxableAmount(taxable);

			saleItem.setGstPercentage(gstPercentage);

			saleItem.setGstAmount(gst);

			saleItem.setLineTotal(lineTotal);

			saleItem = saleItemRepository.save(saleItem);

			savedItems.add(saleItem);

			grossAmount = grossAmount.add(gross);

			discountAmount = discountAmount.add(discount);

			taxableAmount = taxableAmount.add(taxable);

			gstAmount = gstAmount.add(gst);

			totalQuantity += itemRequest.getQuantity();

			allocateStock(

					tenantId,

					sale,

					saleItem,

					itemRequest.getQuantity(),

					saleRate);
		}

		sale.setTotalQuantity(totalQuantity);

		sale.setGrossAmount(grossAmount);

		sale.setDiscountAmount(discountAmount);

		sale.setTaxableAmount(taxableAmount);

		sale.setGstAmount(gstAmount);

		BigDecimal grandTotal = taxableAmount.add(gstAmount).add(money(request.getOtherCharges()))
				.add(money(request.getRoundOffAmount()));

		sale.setGrandTotal(grandTotal);

		BigDecimal paidAmount = money(request.getPaidAmount());

		if (paidAmount.compareTo(grandTotal) > 0) {
			paidAmount = grandTotal;
		}

		sale.setPaidAmount(paidAmount);

		BigDecimal dueAmount = grandTotal.subtract(paidAmount);

		sale.setDueAmount(dueAmount);

		if (paidAmount.compareTo(ZERO) == 0) {

			sale.setPaymentStatus(SaasSalePaymentStatus.UNPAID);

		} else if (dueAmount.compareTo(ZERO) == 0) {

			sale.setPaymentStatus(SaasSalePaymentStatus.PAID);

		} else {

			sale.setPaymentStatus(SaasSalePaymentStatus.PARTIALLY_PAID);
		}

		sale.setSaleStatus(SaasSaleStatus.POSTED);

		sale = saleRepository.save(sale);

		SaasInvoice invoice =
		        createInvoice(
		                sale,
		                savedItems
		        );

		if (paidAmount.compareTo(ZERO) > 0) {

			SaasPaymentRequest payment = new SaasPaymentRequest();

			payment.setTenantId(tenantId);

			payment.setTransactionType("CUSTOMER_RECEIPT");

			payment.setPartyId(customer.getId());

			payment.setPaymentDate(LocalDate.now());

			payment.setAmount(paidAmount);

			if (request.getPaymentMode() != null) {

				payment.setPaymentMode(request.getPaymentMode().name());
			}

			payment.setReferenceType("SALE");

			payment.setReferenceId(sale.getId());

			payment.setRemarks("Payment received against Sale " + sale.getSaleNumber());

			billingService.updatePayment(
			        tenantId,
			        invoice.getId(),
			        sale.getPaymentStatus().name(),
			        sale.getPaymentMode().name(),
			        sale.getPaidAmount(),
			        sale.getSaleNumber()
			);
		}

		notificationService.createSystemNotificationIfNotExists(

		        tenantId,

		        SaasNotificationType.BILLING,

		        SaasNotificationPriority.MEDIUM,

		        "Sale Created",

		        "Sale " + sale.getSaleNumber() + " created successfully.",

		        sale.getId(),

		        "SALE",

		        "/saas/sales"
		);

		return mapSaleResponse(sale, savedItems);
	}

	private SaasInvoice createInvoice(SaasSale sale, List<SaasSaleItem> saleItems) {

		SaasInvoice invoice = new SaasInvoice();

		invoice.setTenantId(sale.getTenantId());

		invoice.setPatientId(sale.getCustomerId());

		invoice.setInvoiceNumber(nextInvoiceNumber(sale.getTenantId()));

		invoice.setInvoiceType(SaasInvoiceType.PHARMACY);

		invoice.setSubtotal(sale.getGrossAmount());

		invoice.setDiscountAmount(sale.getDiscountAmount());

		invoice.setTaxAmount(sale.getGstAmount());

		invoice.setTotalAmount(sale.getGrandTotal());

		invoice.setPaidAmount(sale.getPaidAmount());

		invoice.setDueAmount(sale.getDueAmount());

		invoice.setPaymentMode(sale.getPaymentMode());

		invoice.setTransactionId(sale.getSaleNumber());

		invoice.setNotes("Generated from Sale " + sale.getSaleNumber());

		invoice.setCreatedByAuthUserId(sale.getCreatedByAuthUserId());

		invoice.setInvoiceDateTime(LocalDateTime.now());

		if (sale.getPaidAmount().compareTo(ZERO) == 0) {

			invoice.setPaymentStatus(SaasPaymentStatus.UNPAID);

		} else if (sale.getDueAmount().compareTo(ZERO) == 0) {

			invoice.setPaymentStatus(SaasPaymentStatus.PAID);

			invoice.setPaymentDateTime(LocalDateTime.now());

		} else {

			invoice.setPaymentStatus(SaasPaymentStatus.PARTIAL);

			invoice.setPaymentDateTime(LocalDateTime.now());
		}

		invoice = invoiceRepository.save(invoice);

		for (SaasSaleItem saleItem : saleItems) {

			SaasInvoiceItem item = new SaasInvoiceItem();

			item.setTenantId(sale.getTenantId());

			item.setInvoiceId(invoice.getId());

			item.setItemName(saleItem.getMedicineName());

			item.setItemType(saleItem.getMedicineType());

			item.setQuantity(saleItem.getQuantity());

			item.setUnitPrice(saleItem.getSaleRate());

			item.setTotalPrice(saleItem.getLineTotal());

			invoiceItemRepository.save(item);
		}
		
		return invoice;
	}

	private void allocateStock(Long tenantId, SaasSale sale, SaasSaleItem saleItem, Integer requiredQuantity,
			BigDecimal saleRate) {

		List<SaasMedicineStock> stocks = stockRepository.findByTenantIdAndMedicineIdAndCurrentQuantityGreaterThanOrderByExpiryDateAscCreatedAtAsc(tenantId,
						saleItem.getMedicineId(), 0);

		if (stocks.isEmpty()) {

			throw new RuntimeException("No stock available for " + saleItem.getMedicineName());
		}

		int remaining = requiredQuantity;

		for (SaasMedicineStock stock : stocks) {

			if (remaining <= 0) {
				break;
			}

			int available = stock.getCurrentQuantity();

			if (available <= 0) {
				continue;
			}

			int allocateQty = Math.min(available, remaining);

			stock.setCurrentQuantity(available - allocateQty);

			stockRepository.save(stock);

			SaasSaleStockAllocation allocation = new SaasSaleStockAllocation();

			allocation.setTenantId(tenantId);

			allocation.setSaleId(sale.getId());

			allocation.setSaleItemId(saleItem.getId());

			allocation.setMedicineId(saleItem.getMedicineId());

			allocation.setStockId(stock.getId());

			allocation.setBatchNumber(stock.getBatchNumber());

			allocation.setExpiryDate(stock.getExpiryDate());

			allocation.setAllocatedQuantity(allocateQty);

			allocation.setPurchasePrice(stock.getPurchasePrice());

			allocation.setSaleRate(saleRate);

			allocationRepository.save(allocation);

			remaining -= allocateQty;
		}

		if (remaining > 0) {

			throw new RuntimeException("Insufficient stock for " + saleItem.getMedicineName());
		}
	}

	private void restoreStock(Long tenantId, Long saleId) {

		List<SaasSaleStockAllocation> allocations = allocationRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId,
				saleId);

		for (SaasSaleStockAllocation allocation : allocations) {

			SaasMedicineStock stock = stockRepository.findByIdAndTenantId(allocation.getStockId(), tenantId)
					.orElseThrow(() -> new RuntimeException("Stock not found."));

			stock.setCurrentQuantity(stock.getCurrentQuantity() + allocation.getAllocatedQuantity());

			stockRepository.save(stock);
		}
	}

	private SaasSaleResponse mapSaleResponse(SaasSale sale, List<SaasSaleItem> saleItems) {

		List<SaasSaleItemResponse> itemResponses = new ArrayList<>();

		for (SaasSaleItem item : saleItems) {

			List<SaasSaleStockAllocationResponse> allocations = allocationRepository
					.findByTenantIdAndSaleItemIdOrderByIdAsc(sale.getTenantId(), item.getId()).stream()
					.map(allocation -> new SaasSaleStockAllocationResponse(

							allocation.getId(),

							allocation.getStockId(),

							allocation.getBatchNumber(),

							allocation.getExpiryDate(),

							allocation.getAllocatedQuantity(),

							allocation.getPurchasePrice(),

							allocation.getSaleRate()))
					.toList();

			itemResponses.add(

					new SaasSaleItemResponse(

							item.getId(),

							item.getMedicineId(),

							item.getMedicineName(),

							item.getMedicineType(),

							item.getManufacturer(),

							item.getQuantity(),

							item.getSaleRate(),

							item.getGrossAmount(),

							item.getDiscountPercentage(),

							item.getDiscountAmount(),

							item.getTaxableAmount(),

							item.getGstPercentage(),

							item.getGstAmount(),

							item.getLineTotal(),

							allocations));
		}

		return new SaasSaleResponse(

				sale.getId(),

				sale.getTenantId(),

				sale.getSaleNumber(),

				sale.getSaleDate(),

				sale.getCustomerId(),

				sale.getCustomerCode(),

				sale.getCustomerName(),

				sale.getCustomerType(),

				sale.getCustomerGstin(),

				sale.getTotalQuantity(),

				sale.getGrossAmount(),

				sale.getDiscountAmount(),

				sale.getTaxableAmount(),

				sale.getGstAmount(),

				sale.getOtherCharges(),

				sale.getRoundOffAmount(),

				sale.getGrandTotal(),

				sale.getPaidAmount(),

				sale.getDueAmount(),

				sale.getPaymentStatus().name(),
				
				sale.getPaymentMode(),

				sale.getSaleStatus().name(),

				sale.getRemarks(),

				sale.getCreatedAt(),

				itemResponses);
	}

	@Transactional(readOnly = true)
	public List<SaasSaleResponse> getAllSales(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.VIEW);

		return saleRepository.findByTenantIdOrderBySaleDateDescCreatedAtDesc(tenantId).stream().filter(sale->sale.getSaleStatus()!= SaasSaleStatus.CANCELLED).map(sale -> {

			List<SaasSaleItem> items = saleItemRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId, sale.getId());

			return mapSaleResponse(sale, items);
		}).toList();
	}

	@Transactional(readOnly = true)
	public SaasSaleResponse getSaleById(Long tenantId, Long saleId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.VIEW);

		SaasSale sale = saleRepository.findByIdAndTenantId(saleId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sale not found."));

		List<SaasSaleItem> items = saleItemRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId, saleId);

		return mapSaleResponse(sale, items);
	}

	@Transactional(readOnly = true)
	public List<SaasSaleResponse> searchSales(Long tenantId, String keyword) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {

			return getAllSales(tenantId);
		}

		return saleRepository.searchSales(tenantId, keyword.trim()).stream().filter(sale->sale.getSaleStatus()!=SaasSaleStatus.CANCELLED).map(sale -> {

			List<SaasSaleItem> items = saleItemRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId, sale.getId());

			return mapSaleResponse(sale, items);
		}).toList();
	}

	@Transactional(readOnly = true)
	public SaasSalesSummaryResponse getSalesSummary(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.VIEW);

		long totalSales = saleRepository.countByTenantIdAndSaleStatusNot(tenantId, SaasSaleStatus.CANCELLED);

		BigDecimal totalAmount = Optional.ofNullable(saleRepository.sumGrandTotal(tenantId)).orElse(BigDecimal.ZERO);

		BigDecimal paidAmount = Optional.ofNullable(saleRepository.sumPaidAmount(tenantId)).orElse(BigDecimal.ZERO);

		BigDecimal dueAmount = Optional.ofNullable(saleRepository.sumDueAmount(tenantId)).orElse(BigDecimal.ZERO);

		Long totalQuantity = Optional.ofNullable(saleRepository.sumTotalQuantity(tenantId)).orElse(0L);

		return new SaasSalesSummaryResponse(

				totalSales,

				totalQuantity.intValue(),

				totalAmount,

				paidAmount,

				dueAmount);
	}

	@Transactional
	public void cancelSale(Long tenantId, Long saleId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.CANCEL);

		SaasSale sale = saleRepository.findByIdAndTenantId(saleId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sale not found."));

		if (sale.getSaleStatus() == SaasSaleStatus.CANCELLED) {

			throw new RuntimeException("Sale already cancelled.");
		}

		restoreStock(tenantId, saleId);

		sale.setSaleStatus(SaasSaleStatus.CANCELLED);

		saleRepository.save(sale);

		SaasNotificationRequest notification = new SaasNotificationRequest();

		notification.setTenantId(tenantId);

		notification.setAuthUserId(CurrentUserUtil.getUserId());

		notification.setNotificationType(
		        SaasNotificationType.BILLING.name()
		);

		notification.setPriority(
		        SaasNotificationPriority.MEDIUM.name()
		);

		notification.setTitle("Sale Cancelled");

		notification.setMessage(
		        "Sale " + sale.getSaleNumber() + " cancelled successfully."
		);

		notification.setReferenceId(sale.getId());

		notification.setReferenceType("SALE");

		notification.setActionUrl("/saas/sales");

		notificationService.createNotification(notification);
	}

	@Transactional
	public SaasSaleResponse updateSale(Long saleId, SaasSaleRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.UPDATE);

		SaasSale existingSale = saleRepository.findByIdAndTenantId(saleId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sale not found."));

		if (existingSale.getSaleStatus() == SaasSaleStatus.CANCELLED) {

			throw new RuntimeException("Cancelled sale cannot be updated.");
		}

		restoreStock(tenantId, saleId);

		allocationRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId, saleId)
				.forEach(allocationRepository::delete);

		saleItemRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId, saleId).forEach(saleItemRepository::delete);

		invoiceRepository.findByTenantIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId).stream()
				.filter(invoice -> Objects.equals(invoice.getTransactionId(), existingSale.getSaleNumber())).findFirst()
				.ifPresent(invoice -> {

					invoiceItemRepository.deleteByTenantIdAndInvoiceId(tenantId, invoice.getId());

					invoice.setActive(false);

					invoiceRepository.save(invoice);
				});

		existingSale.setCustomerId(null);
		existingSale.setCustomerCode(null);
		existingSale.setCustomerName(null);
		existingSale.setCustomerType(null);
		existingSale.setCustomerGstin(null);

		existingSale.setGrossAmount(ZERO);
		existingSale.setDiscountAmount(ZERO);
		existingSale.setTaxableAmount(ZERO);
		existingSale.setGstAmount(ZERO);
		existingSale.setGrandTotal(ZERO);
		existingSale.setPaidAmount(ZERO);
		existingSale.setDueAmount(ZERO);
		existingSale.setTotalQuantity(0);

		existingSale.setSaleDate(request.getSaleDate() == null ? LocalDate.now() : request.getSaleDate());

		existingSale.setOtherCharges(money(request.getOtherCharges()));

		existingSale.setRoundOffAmount(money(request.getRoundOffAmount()));

		existingSale.setRemarks(request.getRemarks());

		existingSale.setPaymentMode(request.getPaymentMode());

		saleRepository.save(existingSale);

		SaasSaleRequest newRequest = new SaasSaleRequest();

		newRequest.setTenantId(tenantId);

		newRequest.setSaleDate(existingSale.getSaleDate());

		newRequest.setCustomerId(request.getCustomerId());

		newRequest.setItems(request.getItems());

		newRequest.setPaidAmount(request.getPaidAmount());

		newRequest.setOtherCharges(request.getOtherCharges());

		newRequest.setRoundOffAmount(request.getRoundOffAmount());

		newRequest.setRemarks(request.getRemarks());

		newRequest.setPaymentMode(request.getPaymentMode());

		saleRepository.delete(existingSale);

		return createSale(newRequest);
	}

	@Transactional(readOnly = true)
	public List<SaasSaleResponse> getSalesByCustomer(Long tenantId, Long customerId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(

				tenantId,

				TenantModule.SALES,

				SaasPermissionAction.VIEW);

		return saleRepository.findByTenantIdOrderBySaleDateDescCreatedAtDesc(tenantId).stream()
				.filter(sale -> Objects.equals(sale.getCustomerId(), customerId)).map(sale -> {

					List<SaasSaleItem> items = saleItemRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId,
							sale.getId());

					return mapSaleResponse(sale, items);
				}).toList();
	}

	@Transactional(readOnly = true)
	public boolean hasSufficientStock(Long tenantId, Long medicineId, Integer quantity) {

		Long available = stockRepository.sumAvailableQuantityForSale(tenantId, medicineId, LocalDate.now());

		if (available == null) {
			available = 0L;
		}

		return available >= quantity;
	}

	@Transactional(readOnly = true)
	public Long getAvailableStock(Long tenantId, Long medicineId) {

		Long available = stockRepository.sumAvailableQuantityForSale(tenantId, medicineId, LocalDate.now());

		return available == null ? 0L : available;
	}

	@Transactional(readOnly = true)
	public BigDecimal calculateSaleTotal(SaasSaleRequest request) {

		BigDecimal taxable = ZERO;
		BigDecimal gst = ZERO;

		for (SaasSaleItemRequest item : request.getItems()) {

			BigDecimal qty = BigDecimal.valueOf(item.getQuantity());

			BigDecimal gross = money(item.getSaleRate()).multiply(qty);

			BigDecimal discount = gross.multiply(money(item.getDiscountPercentage())).divide(HUNDRED, 2,
					RoundingMode.HALF_UP);

			BigDecimal lineTaxable = gross.subtract(discount);

			BigDecimal lineGst = lineTaxable.multiply(money(item.getGstPercentage())).divide(HUNDRED, 2,
					RoundingMode.HALF_UP);

			taxable = taxable.add(lineTaxable);

			gst = gst.add(lineGst);
		}

		return taxable.add(gst).add(money(request.getOtherCharges())).add(money(request.getRoundOffAmount()));
	}

	private String nextInvoiceNumber(Long tenantId) {

		long count = invoiceRepository.countByTenantIdAndActiveTrue(tenantId);

		return String.format("INV-%06d", count + 1);
	}

	private SaasPaymentStatus toInvoicePaymentStatus(
	        SaasSalePaymentStatus status
	) {

	    if (status == null) {
	        return SaasPaymentStatus.UNPAID;
	    }

	    return switch (status) {

	        case PAID ->
	                SaasPaymentStatus.PAID;

	        case PARTIALLY_PAID ->
	                SaasPaymentStatus.PARTIAL;

	        case UNPAID ->
	                SaasPaymentStatus.UNPAID;
	    };
	}

	private BigDecimal calculateGross(Integer quantity, BigDecimal saleRate) {

		return money(saleRate).multiply(BigDecimal.valueOf(qty(quantity)));
	}

	private BigDecimal calculateDiscount(BigDecimal gross, BigDecimal percentage) {

		return gross.multiply(money(percentage)).divide(HUNDRED, 2, RoundingMode.HALF_UP);
	}

	private BigDecimal calculateTaxable(BigDecimal gross, BigDecimal discount) {

		return gross.subtract(discount);
	}

	private BigDecimal calculateGst(BigDecimal taxable, BigDecimal percentage) {

		return taxable.multiply(money(percentage)).divide(HUNDRED, 2, RoundingMode.HALF_UP);
	}

	private BigDecimal calculateLineTotal(BigDecimal taxable, BigDecimal gst) {

		return taxable.add(gst);
	}

	private SaasSalePaymentStatus resolvePaymentStatus(BigDecimal grandTotal, BigDecimal paidAmount) {

		if (paidAmount.compareTo(ZERO) == 0) {

			return SaasSalePaymentStatus.UNPAID;
		}

		if (paidAmount.compareTo(grandTotal) >= 0) {

			return SaasSalePaymentStatus.PAID;
		}

		return SaasSalePaymentStatus.PARTIALLY_PAID;
	}

	private void validatePositiveAmount(BigDecimal amount, String field) {

		if (amount != null && amount.compareTo(BigDecimal.ZERO) < 0) {

			throw new RuntimeException(field + " cannot be negative.");
		}
	}

private void validatePositiveQuantity(
        Integer quantity
) {

    if (quantity == null
            || quantity <= 0) {

        throw new RuntimeException(
                "Quantity must be greater than zero."
        );
    }
}

}

