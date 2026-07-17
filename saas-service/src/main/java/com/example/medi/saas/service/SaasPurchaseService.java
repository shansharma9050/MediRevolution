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
public class SaasPurchaseService {

	private static final BigDecimal HUNDRED = new BigDecimal("100");

	private final SaasPurchaseRepository purchaseRepository;
	private final SaasPurchaseItemRepository purchaseItemRepository;
	private final SaasSupplierRepository supplierRepository;
	private final SaasMedicineRepository medicineRepository;
	private final SaasInventoryService inventoryService;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasPartyLedgerService ledgerService;

	public SaasPurchaseService(SaasPurchaseRepository purchaseRepository,
			SaasPurchaseItemRepository purchaseItemRepository, SaasSupplierRepository supplierRepository,
			SaasMedicineRepository medicineRepository, SaasInventoryService inventoryService,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			SaasPartyLedgerService ledgerService) {
		this.purchaseRepository = purchaseRepository;
		this.purchaseItemRepository = purchaseItemRepository;
		this.supplierRepository = supplierRepository;
		this.medicineRepository = medicineRepository;
		this.inventoryService = inventoryService;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.ledgerService = ledgerService;
	}

	public List<SaasPurchaseResponse> getPurchases(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASES, SaasPermissionAction.VIEW);

		return purchaseRepository.findByTenantIdOrderByPurchaseDateDescCreatedAtDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	public List<SaasPurchaseResponse> searchPurchases(Long tenantId, String keyword) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASES, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {
			return getPurchases(tenantId);
		}

		return purchaseRepository.searchPurchases(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	public SaasPurchaseResponse getPurchase(Long tenantId, Long purchaseId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASES, SaasPermissionAction.VIEW);

		return toResponse(findPurchase(tenantId, purchaseId));
	}

	public SaasPurchaseSummaryResponse getSummary(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASES, SaasPermissionAction.VIEW);

		return new SaasPurchaseSummaryResponse(purchaseRepository.countByTenantId(tenantId),
				money(purchaseRepository.sumGrandTotal(tenantId)), money(purchaseRepository.sumPaidAmount(tenantId)),
				money(purchaseRepository.sumDueAmount(tenantId)));
	}

	@Transactional
	public SaasPurchaseResponse createPurchase(SaasPurchaseRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASES, SaasPermissionAction.CREATE);

		SaasSupplier supplier = supplierRepository.findByIdAndTenantId(request.getSupplierId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Supplier not found in this workspace"));

		if (!Boolean.TRUE.equals(supplier.getActive())) {
			throw new RuntimeException("Selected supplier is inactive");
		}

		String supplierInvoiceNumber = normalizeRequired(request.getSupplierInvoiceNumber(), "Supplier invoice number");

		if (purchaseRepository.existsByTenantIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCase(tenantId,
				supplier.getId(), supplierInvoiceNumber)) {

			throw new RuntimeException("This supplier invoice number already exists");
		}

		CalculatedPurchase calculatedPurchase = calculatePurchase(request);

		BigDecimal otherCharges = nonNegativeAmount(request.getOtherCharges(), "Other charges");

		BigDecimal roundOffAmount = money(request.getRoundOffAmount());

		BigDecimal grandTotal = money(calculatedPurchase.taxableAmount().add(calculatedPurchase.gstAmount())
				.add(otherCharges).add(roundOffAmount));

		if (grandTotal.compareTo(BigDecimal.ZERO) < 0) {
			throw new RuntimeException("Grand total cannot be negative");
		}

		BigDecimal paidAmount = nonNegativeAmount(request.getPaidAmount(), "Paid amount");

		if (paidAmount.compareTo(grandTotal) > 0) {
			throw new RuntimeException("Paid amount cannot exceed grand total");
		}

		BigDecimal dueAmount = money(grandTotal.subtract(paidAmount));

		SaasPurchase purchase = new SaasPurchase();

		purchase.setTenantId(tenantId);

		purchase.setPurchaseNumber(generatePurchaseNumber(tenantId));

		purchase.setPurchaseDate(request.getPurchaseDate() == null ? LocalDate.now() : request.getPurchaseDate());

		purchase.setSupplierId(supplier.getId());

		purchase.setSupplierCode(supplier.getSupplierCode());

		purchase.setSupplierName(supplier.getSupplierName());

		purchase.setSupplierInvoiceNumber(supplierInvoiceNumber);

		purchase.setSupplierInvoiceDate(request.getSupplierInvoiceDate());

		purchase.setTotalQuantity(calculatedPurchase.totalQuantity());

		purchase.setTotalFreeQuantity(calculatedPurchase.totalFreeQuantity());

		purchase.setGrossAmount(calculatedPurchase.grossAmount());

		purchase.setDiscountAmount(calculatedPurchase.discountAmount());

		purchase.setTaxableAmount(calculatedPurchase.taxableAmount());

		purchase.setGstAmount(calculatedPurchase.gstAmount());

		purchase.setOtherCharges(otherCharges);

		purchase.setRoundOffAmount(roundOffAmount);

		purchase.setGrandTotal(grandTotal);

		purchase.setPaidAmount(paidAmount);

		purchase.setDueAmount(dueAmount);

		purchase.setPaymentStatus(resolvePaymentStatus(grandTotal, paidAmount));

		purchase.setPurchaseStatus(SaasPurchaseStatus.POSTED);

		purchase.setRemarks(normalizeOptional(request.getRemarks()));

		purchase.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasPurchase savedPurchase = purchaseRepository.save(purchase);

		for (SaasPurchaseItemRequest itemRequest : request.getItems()) {

			SaasMedicine medicine = medicineRepository
					.findByIdAndTenantIdAndActiveTrue(itemRequest.getMedicineId(), tenantId)
					.orElseThrow(() -> new RuntimeException("Medicine not found in this workspace"));

			CalculatedItem calculatedItem = calculateItem(itemRequest);

			SaasPurchaseItem item = new SaasPurchaseItem();

			item.setTenantId(tenantId);
			item.setPurchaseId(savedPurchase.getId());
			item.setMedicineId(medicine.getId());
			item.setMedicineName(medicine.getMedicineName());
			item.setMedicineType(medicine.getMedicineType());
			item.setManufacturer(medicine.getManufacturer());

			item.setBatchNumber(normalizeRequired(itemRequest.getBatchNumber(), "Batch number"));

			item.setManufacturingDate(itemRequest.getManufacturingDate());

			item.setExpiryDate(itemRequest.getExpiryDate());

			item.setQuantity(itemRequest.getQuantity());

			item.setFreeQuantity(itemRequest.getFreeQuantity() == null ? 0 : itemRequest.getFreeQuantity());

			item.setPurchaseRate(calculatedItem.purchaseRate());

			item.setSaleRate(calculatedItem.saleRate());

			item.setMrp(calculatedItem.mrp());

			item.setGrossAmount(calculatedItem.grossAmount());

			item.setDiscountPercentage(calculatedItem.discountPercentage());

			item.setDiscountAmount(calculatedItem.discountAmount());

			item.setTaxableAmount(calculatedItem.taxableAmount());

			item.setGstPercentage(calculatedItem.gstPercentage());

			item.setGstAmount(calculatedItem.gstAmount());

			item.setLineTotal(calculatedItem.lineTotal());

			purchaseItemRepository.save(item);

			int receivedQuantity = item.getQuantity() + item.getFreeQuantity();

			inventoryService.addOrMergePurchaseStock(tenantId, medicine.getId(), item.getBatchNumber(),
					item.getManufacturingDate(), item.getExpiryDate(), receivedQuantity, item.getPurchaseRate(),
					item.getSaleRate(), item.getMrp(), item.getGstPercentage(), supplier.getId(),
					supplier.getSupplierName(), savedPurchase.getId());
		}
		ledgerService.postLedgerEntry(savedPurchase.getTenantId(), SaasPaymentPartyType.SUPPLIER,
				savedPurchase.getSupplierId(), savedPurchase.getSupplierCode(), savedPurchase.getSupplierName(),
				savedPurchase.getPurchaseDate(), SaasLedgerEntryType.PURCHASE, "PURCHASE", savedPurchase.getId(),
				savedPurchase.getPurchaseNumber(), BigDecimal.ZERO, savedPurchase.getGrandTotal(),
				"Purchase invoice posted: " + savedPurchase.getPurchaseNumber());

		if (savedPurchase.getPaidAmount() != null && savedPurchase.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {

			ledgerService.postLedgerEntry(savedPurchase.getTenantId(), SaasPaymentPartyType.SUPPLIER,
					savedPurchase.getSupplierId(), savedPurchase.getSupplierCode(), savedPurchase.getSupplierName(),
					savedPurchase.getPurchaseDate(), SaasLedgerEntryType.SUPPLIER_PAYMENT, "PURCHASE_INITIAL_PAYMENT",
					savedPurchase.getId(), savedPurchase.getPurchaseNumber(), savedPurchase.getPaidAmount(),
					BigDecimal.ZERO, "Initial payment made against purchase " + savedPurchase.getPurchaseNumber());
		}

		return toResponse(savedPurchase);
	}

	private CalculatedPurchase calculatePurchase(SaasPurchaseRequest request) {

		BigDecimal grossAmount = BigDecimal.ZERO;

		BigDecimal discountAmount = BigDecimal.ZERO;

		BigDecimal taxableAmount = BigDecimal.ZERO;

		BigDecimal gstAmount = BigDecimal.ZERO;

		int totalQuantity = 0;
		int totalFreeQuantity = 0;

		for (SaasPurchaseItemRequest item : request.getItems()) {

			validateItem(item);

			CalculatedItem calculatedItem = calculateItem(item);

			grossAmount = grossAmount.add(calculatedItem.grossAmount());

			discountAmount = discountAmount.add(calculatedItem.discountAmount());

			taxableAmount = taxableAmount.add(calculatedItem.taxableAmount());

			gstAmount = gstAmount.add(calculatedItem.gstAmount());

			totalQuantity += item.getQuantity();

			totalFreeQuantity += item.getFreeQuantity() == null ? 0 : item.getFreeQuantity();
		}

		return new CalculatedPurchase(money(grossAmount), money(discountAmount), money(taxableAmount), money(gstAmount),
				totalQuantity, totalFreeQuantity);
	}

	private CalculatedItem calculateItem(SaasPurchaseItemRequest item) {

		BigDecimal purchaseRate = nonNegativeAmount(item.getPurchaseRate(), "Purchase rate");

		BigDecimal saleRate = nonNegativeAmount(item.getSaleRate(), "Sale rate");

		BigDecimal mrp = nonNegativeAmount(item.getMrp(), "MRP");

		BigDecimal discountPercentage = validPercentage(item.getDiscountPercentage(), "Discount percentage");

		BigDecimal gstPercentage = validPercentage(item.getGstPercentage(), "GST percentage");

		BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());

		BigDecimal grossAmount = money(purchaseRate.multiply(quantity));

		BigDecimal discountAmount = money(
				grossAmount.multiply(discountPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal taxableAmount = money(grossAmount.subtract(discountAmount));

		BigDecimal gstAmount = money(taxableAmount.multiply(gstPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal lineTotal = money(taxableAmount.add(gstAmount));

		return new CalculatedItem(purchaseRate, saleRate, mrp, discountPercentage, gstPercentage, grossAmount,
				discountAmount, taxableAmount, gstAmount, lineTotal);
	}

	private void validateRequest(SaasPurchaseRequest request) {

		if (request == null) {
			throw new RuntimeException("Purchase request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getSupplierId() == null) {
			throw new RuntimeException("Supplier is required");
		}

		normalizeRequired(request.getSupplierInvoiceNumber(), "Supplier invoice number");

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("At least one purchase item is required");
		}

		request.getItems().forEach(this::validateItem);

		nonNegativeAmount(request.getOtherCharges(), "Other charges");

		nonNegativeAmount(request.getPaidAmount(), "Paid amount");
	}

	private void validateItem(SaasPurchaseItemRequest item) {

		if (item == null) {
			throw new RuntimeException("Purchase item is required");
		}

		if (item.getMedicineId() == null) {
			throw new RuntimeException("Medicine is required");
		}

		normalizeRequired(item.getBatchNumber(), "Batch number");

		if (item.getExpiryDate() == null) {
			throw new RuntimeException("Expiry date is required");
		}

		if (item.getManufacturingDate() != null && item.getExpiryDate().isBefore(item.getManufacturingDate())) {

			throw new RuntimeException("Expiry date cannot be before manufacturing date");
		}

		if (item.getExpiryDate().isBefore(LocalDate.now())) {

			throw new RuntimeException("Expired medicine cannot be purchased");
		}

		if (item.getQuantity() == null || item.getQuantity() <= 0) {

			throw new RuntimeException("Purchase quantity must be greater than 0");
		}

		if (item.getFreeQuantity() != null && item.getFreeQuantity() < 0) {

			throw new RuntimeException("Free quantity cannot be negative");
		}

		nonNegativeAmount(item.getPurchaseRate(), "Purchase rate");

		nonNegativeAmount(item.getSaleRate(), "Sale rate");

		nonNegativeAmount(item.getMrp(), "MRP");

		validPercentage(item.getDiscountPercentage(), "Discount percentage");

		validPercentage(item.getGstPercentage(), "GST percentage");
	}

	private SaasPurchase findPurchase(Long tenantId, Long purchaseId) {

		if (purchaseId == null) {
			throw new RuntimeException("Purchase id is required");
		}

		return purchaseRepository.findByIdAndTenantId(purchaseId, tenantId)
				.orElseThrow(() -> new RuntimeException("Purchase not found"));
	}

	private SaasPurchaseResponse toResponse(SaasPurchase purchase) {

		List<SaasPurchaseItemResponse> items = purchaseItemRepository
				.findByTenantIdAndPurchaseIdOrderByIdAsc(purchase.getTenantId(), purchase.getId()).stream()
				.map(this::toItemResponse).toList();

		return new SaasPurchaseResponse(purchase.getId(), purchase.getTenantId(), purchase.getPurchaseNumber(),
				purchase.getPurchaseDate(), purchase.getSupplierId(), purchase.getSupplierCode(),
				purchase.getSupplierName(), purchase.getSupplierInvoiceNumber(), purchase.getSupplierInvoiceDate(),
				purchase.getTotalQuantity(), purchase.getTotalFreeQuantity(), purchase.getGrossAmount(),
				purchase.getDiscountAmount(), purchase.getTaxableAmount(), purchase.getGstAmount(),
				purchase.getOtherCharges(), purchase.getRoundOffAmount(), purchase.getGrandTotal(),
				purchase.getPaidAmount(), purchase.getDueAmount(), purchase.getPaymentStatus().name(),
				purchase.getPurchaseStatus().name(), purchase.getRemarks(), purchase.getCreatedAt(), items);
	}

	private SaasPurchaseItemResponse toItemResponse(SaasPurchaseItem item) {

		return new SaasPurchaseItemResponse(item.getId(), item.getMedicineId(), item.getMedicineName(),
				item.getMedicineType(), item.getManufacturer(), item.getBatchNumber(), item.getManufacturingDate(),
				item.getExpiryDate(), item.getQuantity(), item.getFreeQuantity(), item.getPurchaseRate(),
				item.getSaleRate(), item.getMrp(), item.getGrossAmount(), item.getDiscountPercentage(),
				item.getDiscountAmount(), item.getTaxableAmount(), item.getGstPercentage(), item.getGstAmount(),
				item.getLineTotal());
	}

	private SaasPurchasePaymentStatus resolvePaymentStatus(BigDecimal grandTotal, BigDecimal paidAmount) {

		if (paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return SaasPurchasePaymentStatus.UNPAID;
		}

		if (paidAmount.compareTo(grandTotal) >= 0) {
			return SaasPurchasePaymentStatus.PAID;
		}

		return SaasPurchasePaymentStatus.PARTIALLY_PAID;
	}

	private String generatePurchaseNumber(Long tenantId) {

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return "PUR-" + tenantId + "-" + timestamp + "-" + random;
	}

	private void validateWorkspace(Long tenantId) {

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType) && !"RETAILER".equals(tenantType)) {

			throw new RuntimeException("Purchases module is available only for Wholesaler and Retailer workspaces");
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

	private String normalizeRequired(String value, String fieldName) {

		String normalized = normalizeOptional(value);

		if (normalized == null) {
			throw new RuntimeException(fieldName + " is required");
		}

		return normalized;
	}

	private String normalizeOptional(String value) {

		if (value == null) {
			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}

	private record CalculatedPurchase(BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount,
			BigDecimal gstAmount, Integer totalQuantity, Integer totalFreeQuantity) {
	}

	private record CalculatedItem(BigDecimal purchaseRate, BigDecimal saleRate, BigDecimal mrp,
			BigDecimal discountPercentage, BigDecimal gstPercentage, BigDecimal grossAmount, BigDecimal discountAmount,
			BigDecimal taxableAmount, BigDecimal gstAmount, BigDecimal lineTotal) {
	}
}