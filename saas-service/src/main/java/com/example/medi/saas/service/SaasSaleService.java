package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.*;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class SaasSaleService {

	private static final BigDecimal HUNDRED = new BigDecimal("100");

	private final SaasSaleRepository saleRepository;
	private final SaasSaleItemRepository saleItemRepository;
	private final SaasSaleStockAllocationRepository allocationRepository;
	private final SaasCustomerRepository customerRepository;
	private final SaasMedicineRepository medicineRepository;
	private final SaasMedicineStockRepository stockRepository;
	private final SaasInventoryService inventoryService;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasPartyLedgerService ledgerService;

	public SaasSaleService(SaasSaleRepository saleRepository, SaasSaleItemRepository saleItemRepository,
			SaasSaleStockAllocationRepository allocationRepository, SaasCustomerRepository customerRepository,
			SaasMedicineRepository medicineRepository, SaasMedicineStockRepository stockRepository,
			SaasInventoryService inventoryService, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService, SaasPartyLedgerService ledgerService) {
		this.saleRepository = saleRepository;
		this.saleItemRepository = saleItemRepository;
		this.allocationRepository = allocationRepository;
		this.customerRepository = customerRepository;
		this.medicineRepository = medicineRepository;
		this.stockRepository = stockRepository;
		this.inventoryService = inventoryService;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.ledgerService = ledgerService;
	}

	public List<SaasSaleResponse> getSales(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES, SaasPermissionAction.VIEW);

		return saleRepository.findByTenantIdOrderBySaleDateDescCreatedAtDesc(tenantId).stream().map(this::toResponse)
				.toList();
	}

	public List<SaasSaleResponse> searchSales(Long tenantId, String keyword) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {
			return getSales(tenantId);
		}

		return saleRepository.searchSales(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	public SaasSaleResponse getSale(Long tenantId, Long saleId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES, SaasPermissionAction.VIEW);

		return toResponse(findSale(tenantId, saleId));
	}

	public SaasSaleSummaryResponse getSummary(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES, SaasPermissionAction.VIEW);

		return new SaasSaleSummaryResponse(
				saleRepository.countByTenantIdAndSaleStatusNot(tenantId, SaasSaleStatus.CANCELLED),
				money(saleRepository.sumGrandTotal(tenantId)), money(saleRepository.sumPaidAmount(tenantId)),
				money(saleRepository.sumDueAmount(tenantId)), safeLong(saleRepository.sumTotalQuantity(tenantId)));
	}

	@Transactional
	public SaasSaleResponse createSale(SaasSaleRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES, SaasPermissionAction.CREATE);

		SaasCustomer customer = customerRepository.findByIdAndTenantId(request.getCustomerId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Customer not found in this workspace"));

		if (!Boolean.TRUE.equals(customer.getActive())) {
			throw new RuntimeException("Selected customer is inactive");
		}

		CalculatedSale calculatedSale = calculateSale(request);

		BigDecimal otherCharges = nonNegativeAmount(request.getOtherCharges(), "Other charges");

		BigDecimal roundOffAmount = money(request.getRoundOffAmount());

		BigDecimal grandTotal = money(
				calculatedSale.taxableAmount().add(calculatedSale.gstAmount()).add(otherCharges).add(roundOffAmount));

		if (grandTotal.compareTo(BigDecimal.ZERO) < 0) {
			throw new RuntimeException("Grand total cannot be negative");
		}

		BigDecimal paidAmount = nonNegativeAmount(request.getPaidAmount(), "Paid amount");

		if (paidAmount.compareTo(grandTotal) > 0) {
			throw new RuntimeException("Paid amount cannot exceed grand total");
		}

		BigDecimal dueAmount = money(grandTotal.subtract(paidAmount));

		SaasSale sale = new SaasSale();

		sale.setTenantId(tenantId);

		sale.setSaleNumber(generateSaleNumber(tenantId));

		sale.setSaleDate(request.getSaleDate() == null ? LocalDate.now() : request.getSaleDate());

		sale.setCustomerId(customer.getId());

		sale.setCustomerCode(customer.getCustomerCode());

		sale.setCustomerName(customer.getCustomerName());

		sale.setCustomerType(customer.getCustomerType());

		sale.setCustomerGstin(customer.getGstin());

		sale.setTotalQuantity(calculatedSale.totalQuantity());

		sale.setGrossAmount(calculatedSale.grossAmount());

		sale.setDiscountAmount(calculatedSale.discountAmount());

		sale.setTaxableAmount(calculatedSale.taxableAmount());

		sale.setGstAmount(calculatedSale.gstAmount());

		sale.setOtherCharges(otherCharges);

		sale.setRoundOffAmount(roundOffAmount);

		sale.setGrandTotal(grandTotal);

		sale.setPaidAmount(paidAmount);

		sale.setDueAmount(dueAmount);

		sale.setPaymentStatus(resolvePaymentStatus(grandTotal, paidAmount));

		sale.setSaleStatus(SaasSaleStatus.POSTED);

		sale.setRemarks(normalizeOptional(request.getRemarks()));

		sale.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSale savedSale = saleRepository.save(sale);

		for (SaasSaleItemRequest itemRequest : request.getItems()) {

			SaasMedicine medicine = medicineRepository
					.findByIdAndTenantIdAndActiveTrue(itemRequest.getMedicineId(), tenantId)
					.orElseThrow(() -> new RuntimeException("Medicine not found in this workspace"));

			CalculatedItem calculatedItem = calculateItem(itemRequest);

			SaasSaleItem saleItem = new SaasSaleItem();

			saleItem.setTenantId(tenantId);
			saleItem.setSaleId(savedSale.getId());
			saleItem.setMedicineId(medicine.getId());
			saleItem.setMedicineName(medicine.getMedicineName());
			saleItem.setMedicineType(medicine.getMedicineType());
			saleItem.setManufacturer(medicine.getManufacturer());

			saleItem.setQuantity(itemRequest.getQuantity());

			saleItem.setSaleRate(calculatedItem.saleRate());

			saleItem.setGrossAmount(calculatedItem.grossAmount());

			saleItem.setDiscountPercentage(calculatedItem.discountPercentage());

			saleItem.setDiscountAmount(calculatedItem.discountAmount());

			saleItem.setTaxableAmount(calculatedItem.taxableAmount());

			saleItem.setGstPercentage(calculatedItem.gstPercentage());

			saleItem.setGstAmount(calculatedItem.gstAmount());

			saleItem.setLineTotal(calculatedItem.lineTotal());

			SaasSaleItem savedItem = saleItemRepository.save(saleItem);

			allocateStockUsingFefo(tenantId, savedSale, savedItem, itemRequest);
		}

		ledgerService.postLedgerEntry(savedSale.getTenantId(), SaasPaymentPartyType.CUSTOMER, savedSale.getCustomerId(),
				savedSale.getCustomerCode(), savedSale.getCustomerName(), savedSale.getSaleDate(),
				SaasLedgerEntryType.SALE, "SALE", savedSale.getId(), savedSale.getSaleNumber(),
				savedSale.getGrandTotal(), BigDecimal.ZERO, "Sale invoice posted: " + savedSale.getSaleNumber());

		
		if (savedSale.getPaidAmount() != null && savedSale.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {

			ledgerService.postLedgerEntry(savedSale.getTenantId(), SaasPaymentPartyType.CUSTOMER,
					savedSale.getCustomerId(), savedSale.getCustomerCode(), savedSale.getCustomerName(),
					savedSale.getSaleDate(), SaasLedgerEntryType.CUSTOMER_RECEIPT, "SALE_INITIAL_RECEIPT",
					savedSale.getId(), savedSale.getSaleNumber(), BigDecimal.ZERO, savedSale.getPaidAmount(),
					"Initial payment received against sale " + savedSale.getSaleNumber());
		}

		return toResponse(savedSale);
	}

	private void allocateStockUsingFefo(Long tenantId, SaasSale sale, SaasSaleItem saleItem,
			SaasSaleItemRequest request) {

		List<SaasMedicineStock> batches = stockRepository.findAvailableBatchesForSale(tenantId, request.getMedicineId(),
				sale.getSaleDate());

		int totalAvailable = batches.stream()
				.mapToInt(stock -> stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity()).sum();

		int requiredQuantity = request.getQuantity();

		if (totalAvailable < requiredQuantity) {
			throw new RuntimeException("Insufficient stock for " + saleItem.getMedicineName() + ". Available: "
					+ totalAvailable + ", Required: " + requiredQuantity);
		}

		int remaining = requiredQuantity;

		for (SaasMedicineStock stock : batches) {

			if (remaining <= 0) {
				break;
			}

			int currentQuantity = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();

			int allocatedQuantity = Math.min(currentQuantity, remaining);

			if (allocatedQuantity <= 0) {
				continue;
			}

			stock.setCurrentQuantity(currentQuantity - allocatedQuantity);

			stock.touch();

			stockRepository.save(stock);

			SaasSaleStockAllocation allocation = new SaasSaleStockAllocation();

			allocation.setTenantId(tenantId);
			allocation.setSaleId(sale.getId());
			allocation.setSaleItemId(saleItem.getId());
			allocation.setMedicineId(saleItem.getMedicineId());
			allocation.setStockId(stock.getId());
			allocation.setBatchNumber(stock.getBatchNumber());
			allocation.setExpiryDate(stock.getExpiryDate());
			allocation.setAllocatedQuantity(allocatedQuantity);
			allocation.setPurchasePrice(money(stock.getPurchasePrice()));
			allocation.setSaleRate(saleItem.getSaleRate());

			allocationRepository.save(allocation);

			inventoryService.createMovement(tenantId, saleItem.getMedicineId(), stock.getId(),
					SaasStockMovementType.SALE, allocatedQuantity, "Stock sold through sale " + sale.getSaleNumber(),
					sale.getId());

			remaining -= allocatedQuantity;
		}

		if (remaining > 0) {
			throw new RuntimeException("Unable to allocate complete stock for " + saleItem.getMedicineName());
		}
	}

	private CalculatedSale calculateSale(SaasSaleRequest request) {

		BigDecimal grossAmount = BigDecimal.ZERO;

		BigDecimal discountAmount = BigDecimal.ZERO;

		BigDecimal taxableAmount = BigDecimal.ZERO;

		BigDecimal gstAmount = BigDecimal.ZERO;

		int totalQuantity = 0;

		for (SaasSaleItemRequest item : request.getItems()) {

			validateItem(item);

			CalculatedItem calculatedItem = calculateItem(item);

			grossAmount = grossAmount.add(calculatedItem.grossAmount());

			discountAmount = discountAmount.add(calculatedItem.discountAmount());

			taxableAmount = taxableAmount.add(calculatedItem.taxableAmount());

			gstAmount = gstAmount.add(calculatedItem.gstAmount());

			totalQuantity += item.getQuantity();
		}

		return new CalculatedSale(money(grossAmount), money(discountAmount), money(taxableAmount), money(gstAmount),
				totalQuantity);
	}

	private CalculatedItem calculateItem(SaasSaleItemRequest item) {

		BigDecimal saleRate = nonNegativeAmount(item.getSaleRate(), "Sale rate");

		BigDecimal discountPercentage = validPercentage(item.getDiscountPercentage(), "Discount percentage");

		BigDecimal gstPercentage = validPercentage(item.getGstPercentage(), "GST percentage");

		BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());

		BigDecimal grossAmount = money(saleRate.multiply(quantity));

		BigDecimal discountAmount = money(
				grossAmount.multiply(discountPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal taxableAmount = money(grossAmount.subtract(discountAmount));

		BigDecimal gstAmount = money(taxableAmount.multiply(gstPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal lineTotal = money(taxableAmount.add(gstAmount));

		return new CalculatedItem(saleRate, discountPercentage, gstPercentage, grossAmount, discountAmount,
				taxableAmount, gstAmount, lineTotal);
	}

	private void validateRequest(SaasSaleRequest request) {

		if (request == null) {
			throw new RuntimeException("Sale request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getCustomerId() == null) {
			throw new RuntimeException("Customer is required");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("At least one sale item is required");
		}

		request.getItems().forEach(this::validateItem);

		java.util.Set<Long> medicineIds = new java.util.HashSet<>();

		for (SaasSaleItemRequest item : request.getItems()) {

			if (!medicineIds.add(item.getMedicineId())) {

				throw new RuntimeException("Duplicate medicine items are not allowed in one sale");
			}
		}

		nonNegativeAmount(request.getOtherCharges(), "Other charges");

		nonNegativeAmount(request.getPaidAmount(), "Paid amount");
	}

	private void validateItem(SaasSaleItemRequest item) {

		if (item == null) {
			throw new RuntimeException("Sale item is required");
		}

		if (item.getMedicineId() == null) {
			throw new RuntimeException("Medicine is required");
		}

		if (item.getQuantity() == null || item.getQuantity() <= 0) {

			throw new RuntimeException("Sale quantity must be greater than 0");
		}

		nonNegativeAmount(item.getSaleRate(), "Sale rate");

		validPercentage(item.getDiscountPercentage(), "Discount percentage");

		validPercentage(item.getGstPercentage(), "GST percentage");
	}

	private SaasSale findSale(Long tenantId, Long saleId) {

		if (saleId == null) {
			throw new RuntimeException("Sale id is required");
		}

		return saleRepository.findByIdAndTenantId(saleId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sale not found"));
	}

	private SaasSaleResponse toResponse(SaasSale sale) {

		List<SaasSaleItemResponse> items = saleItemRepository
				.findByTenantIdAndSaleIdOrderByIdAsc(sale.getTenantId(), sale.getId()).stream()
				.map(this::toItemResponse).toList();

		return new SaasSaleResponse(sale.getId(), sale.getTenantId(), sale.getSaleNumber(), sale.getSaleDate(),
				sale.getCustomerId(), sale.getCustomerCode(), sale.getCustomerName(), sale.getCustomerType(),
				sale.getCustomerGstin(), sale.getTotalQuantity(), sale.getGrossAmount(), sale.getDiscountAmount(),
				sale.getTaxableAmount(), sale.getGstAmount(), sale.getOtherCharges(), sale.getRoundOffAmount(),
				sale.getGrandTotal(), sale.getPaidAmount(), sale.getDueAmount(), sale.getPaymentStatus().name(),
				sale.getSaleStatus().name(), sale.getRemarks(), sale.getCreatedAt(), items);
	}

	private SaasSaleItemResponse toItemResponse(SaasSaleItem item) {

		List<SaasSaleStockAllocationResponse> allocations = allocationRepository
				.findByTenantIdAndSaleItemIdOrderByIdAsc(item.getTenantId(), item.getId()).stream()
				.map(this::toAllocationResponse).toList();

		return new SaasSaleItemResponse(item.getId(), item.getMedicineId(), item.getMedicineName(),
				item.getMedicineType(), item.getManufacturer(), item.getQuantity(), item.getSaleRate(),
				item.getGrossAmount(), item.getDiscountPercentage(), item.getDiscountAmount(), item.getTaxableAmount(),
				item.getGstPercentage(), item.getGstAmount(), item.getLineTotal(), allocations);
	}

	private SaasSaleStockAllocationResponse toAllocationResponse(SaasSaleStockAllocation allocation) {

		return new SaasSaleStockAllocationResponse(allocation.getId(), allocation.getStockId(),
				allocation.getBatchNumber(), allocation.getExpiryDate(), allocation.getAllocatedQuantity(),
				allocation.getPurchasePrice(), allocation.getSaleRate());
	}

	private SaasSalePaymentStatus resolvePaymentStatus(BigDecimal grandTotal, BigDecimal paidAmount) {

		if (paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return SaasSalePaymentStatus.UNPAID;
		}

		if (paidAmount.compareTo(grandTotal) >= 0) {
			return SaasSalePaymentStatus.PAID;
		}

		return SaasSalePaymentStatus.PARTIALLY_PAID;
	}

	private String generateSaleNumber(Long tenantId) {

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return "SAL-" + tenantId + "-" + timestamp + "-" + random;
	}

	private void validateWorkspace(Long tenantId) {

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType) && !"RETAILER".equals(tenantType)) {

			throw new RuntimeException("Sales module is available only for Wholesaler and Retailer workspaces");
		}
	}

	private BigDecimal money(BigDecimal value) {

		return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal nonNegativeAmount(BigDecimal value, String fieldName) {

		BigDecimal amount = money(value);

		if (amount.compareTo(BigDecimal.ZERO) < 0) {
			throw new RuntimeException(fieldName + " cannot be negative");
		}

		return amount;
	}

	private BigDecimal validPercentage(BigDecimal value, String fieldName) {

		BigDecimal percentage = money(value);

		if (percentage.compareTo(BigDecimal.ZERO) < 0 || percentage.compareTo(HUNDRED) > 0) {

			throw new RuntimeException(fieldName + " must be between 0 and 100");
		}

		return percentage;
	}

	private String normalizeOptional(String value) {

		if (value == null) {
			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}

	private Long safeLong(Long value) {
		return value == null ? 0L : value;
	}

	private record CalculatedSale(BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount,
			BigDecimal gstAmount, Integer totalQuantity) {
	}

	private record CalculatedItem(BigDecimal saleRate, BigDecimal discountPercentage, BigDecimal gstPercentage,
			BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount, BigDecimal gstAmount,
			BigDecimal lineTotal) {
	}
}