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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class SaasPurchaseReturnService {

	private static final BigDecimal HUNDRED = new BigDecimal("100");

	private final SaasPurchaseReturnRepository returnRepository;
	private final SaasPurchaseReturnItemRepository returnItemRepository;
	private final SaasPurchaseRepository purchaseRepository;
	private final SaasPurchaseItemRepository purchaseItemRepository;
	private final SaasMedicineStockRepository stockRepository;
	private final SaasInventoryService inventoryService;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasPartyLedgerService ledgerService;

	public SaasPurchaseReturnService(SaasPurchaseReturnRepository returnRepository,
			SaasPurchaseReturnItemRepository returnItemRepository, SaasPurchaseRepository purchaseRepository,
			SaasPurchaseItemRepository purchaseItemRepository, SaasMedicineStockRepository stockRepository,
			SaasInventoryService inventoryService, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService,SaasPartyLedgerService ledgerService) {
		this.returnRepository = returnRepository;
		this.returnItemRepository = returnItemRepository;
		this.purchaseRepository = purchaseRepository;
		this.purchaseItemRepository = purchaseItemRepository;
		this.stockRepository = stockRepository;
		this.inventoryService = inventoryService;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.ledgerService=ledgerService;
	}

	public List<SaasPurchaseReturnResponse> getReturns(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASE_RETURNS, SaasPermissionAction.VIEW);

		return returnRepository.findByTenantIdOrderByReturnDateDescCreatedAtDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	public List<SaasPurchaseReturnResponse> searchReturns(Long tenantId, String keyword) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASE_RETURNS, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {
			return getReturns(tenantId);
		}

		return returnRepository.searchReturns(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	public SaasPurchaseReturnResponse getReturn(Long tenantId, Long returnId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASE_RETURNS, SaasPermissionAction.VIEW);

		return toResponse(findReturn(tenantId, returnId));
	}

	public SaasPurchaseReturnSummaryResponse getSummary(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASE_RETURNS, SaasPermissionAction.VIEW);

		return new SaasPurchaseReturnSummaryResponse(
				returnRepository.countByTenantIdAndReturnStatusNot(tenantId, SaasPurchaseReturnStatus.CANCELLED),

				safeLong(returnRepository.sumReturnedQuantity(tenantId)),

				money(returnRepository.sumReturnAmount(tenantId)));
	}

	public List<SaasPurchaseReturnAvailabilityResponse> getPurchaseReturnAvailability(Long tenantId, Long purchaseId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASE_RETURNS, SaasPermissionAction.VIEW);

		findPurchase(tenantId, purchaseId);

		return purchaseItemRepository.findByTenantIdAndPurchaseIdOrderByIdAsc(tenantId, purchaseId).stream()
				.map(this::toAvailabilityResponse).toList();
	}

	@Transactional
	public SaasPurchaseReturnResponse createReturn(SaasPurchaseReturnRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PURCHASE_RETURNS, SaasPermissionAction.CREATE);

		SaasPurchase purchase = findPurchase(tenantId, request.getPurchaseId());

		if (SaasPurchaseStatus.CANCELLED.equals(purchase.getPurchaseStatus())) {

			throw new RuntimeException("Cancelled purchase cannot be returned");
		}

		LocalDate returnDate = request.getReturnDate() == null ? LocalDate.now() : request.getReturnDate();

		if (purchase.getPurchaseDate() != null && returnDate.isBefore(purchase.getPurchaseDate())) {

			throw new RuntimeException("Return date cannot be before purchase date");
		}

		Set<Long> purchaseItemIds = new HashSet<>();

		CalculatedReturn calculatedReturn = calculateReturn(tenantId, purchase, request, purchaseItemIds);

		BigDecimal otherCharges = nonNegativeAmount(request.getOtherCharges(), "Other charges");

		BigDecimal roundOff = money(request.getRoundOffAmount());

		BigDecimal grandTotal = money(
				calculatedReturn.taxableAmount().add(calculatedReturn.gstAmount()).add(otherCharges).add(roundOff));

		if (grandTotal.compareTo(BigDecimal.ZERO) < 0) {
			throw new RuntimeException("Return grand total cannot be negative");
		}

		SaasPurchaseReturn purchaseReturn = new SaasPurchaseReturn();

		purchaseReturn.setTenantId(tenantId);

		purchaseReturn.setReturnNumber(generateReturnNumber(tenantId));

		purchaseReturn.setReturnDate(returnDate);

		purchaseReturn.setPurchaseId(purchase.getId());

		purchaseReturn.setPurchaseNumber(purchase.getPurchaseNumber());

		purchaseReturn.setSupplierInvoiceNumber(purchase.getSupplierInvoiceNumber());

		purchaseReturn.setSupplierId(purchase.getSupplierId());

		purchaseReturn.setSupplierCode(purchase.getSupplierCode());

		purchaseReturn.setSupplierName(purchase.getSupplierName());

		purchaseReturn.setTotalQuantity(calculatedReturn.totalQuantity());

		purchaseReturn.setGrossAmount(calculatedReturn.grossAmount());

		purchaseReturn.setDiscountAmount(calculatedReturn.discountAmount());

		purchaseReturn.setTaxableAmount(calculatedReturn.taxableAmount());

		purchaseReturn.setGstAmount(calculatedReturn.gstAmount());

		purchaseReturn.setOtherCharges(otherCharges);

		purchaseReturn.setRoundOffAmount(roundOff);

		purchaseReturn.setGrandTotal(grandTotal);

		purchaseReturn.setReturnStatus(SaasPurchaseReturnStatus.POSTED);

		purchaseReturn.setDebitNoteNumber(normalizeOptional(request.getDebitNoteNumber()));

		purchaseReturn.setRemarks(normalizeOptional(request.getRemarks()));

		purchaseReturn.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasPurchaseReturn savedReturn = returnRepository.save(purchaseReturn);

		for (SaasPurchaseReturnItemRequest itemRequest : request.getItems()) {

			processReturnItem(tenantId, purchase, savedReturn, itemRequest);
		}
		
		ledgerService.postLedgerEntry(
		        savedReturn.getTenantId(),
		        SaasPaymentPartyType.SUPPLIER,
		        savedReturn.getSupplierId(),
		        savedReturn.getSupplierCode(),
		        savedReturn.getSupplierName(),
		        savedReturn.getReturnDate(),
		        SaasLedgerEntryType.PURCHASE_RETURN,
		        "PURCHASE_RETURN",
		        savedReturn.getId(),
		        savedReturn.getReturnNumber(),
		        savedReturn.getGrandTotal(),
		        BigDecimal.ZERO,
		        "Purchase return posted: "
		                + savedReturn.getReturnNumber()
		);

		return toResponse(savedReturn);
	}

	private CalculatedReturn calculateReturn(Long tenantId, SaasPurchase purchase, SaasPurchaseReturnRequest request,
			Set<Long> purchaseItemIds) {

		BigDecimal grossAmount = BigDecimal.ZERO;

		BigDecimal discountAmount = BigDecimal.ZERO;

		BigDecimal taxableAmount = BigDecimal.ZERO;

		BigDecimal gstAmount = BigDecimal.ZERO;

		int totalQuantity = 0;

		for (SaasPurchaseReturnItemRequest itemRequest : request.getItems()) {

			validateItemRequest(itemRequest);

			if (!purchaseItemIds.add(itemRequest.getPurchaseItemId())) {

				throw new RuntimeException("Duplicate purchase items are not allowed");
			}

			SaasPurchaseItem purchaseItem = findPurchaseItem(tenantId, purchase.getId(),
					itemRequest.getPurchaseItemId());

			validateReturnAvailability(tenantId, purchaseItem, itemRequest);

			CalculatedItem item = calculateItem(purchaseItem, itemRequest.getReturnQuantity());

			grossAmount = grossAmount.add(item.grossAmount());

			discountAmount = discountAmount.add(item.discountAmount());

			taxableAmount = taxableAmount.add(item.taxableAmount());

			gstAmount = gstAmount.add(item.gstAmount());

			totalQuantity += itemRequest.getReturnQuantity();
		}

		return new CalculatedReturn(money(grossAmount), money(discountAmount), money(taxableAmount), money(gstAmount),
				totalQuantity);
	}

	private void processReturnItem(Long tenantId, SaasPurchase purchase, SaasPurchaseReturn purchaseReturn,
			SaasPurchaseReturnItemRequest request) {

		SaasPurchaseItem purchaseItem = findPurchaseItem(tenantId, purchase.getId(), request.getPurchaseItemId());

		SaasMedicineStock stock = stockRepository.findStockForUpdate(request.getStockId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Stock batch not found"));

		validateStockMatchesPurchaseItem(purchaseItem, stock);

		validateReturnAvailability(tenantId, purchaseItem, request);

		int currentQuantity = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();

		int returnQuantity = request.getReturnQuantity();

		if (currentQuantity < returnQuantity) {

			throw new RuntimeException("Current stock is insufficient for batch " + stock.getBatchNumber()
					+ ". Current stock: " + currentQuantity + ", Return quantity: " + returnQuantity);
		}

		CalculatedItem calculatedItem = calculateItem(purchaseItem, returnQuantity);

		SaasPurchaseReturnReason reason = parseReturnReason(request.getReturnReason());

		SaasPurchaseReturnItem returnItem = new SaasPurchaseReturnItem();

		returnItem.setTenantId(tenantId);

		returnItem.setPurchaseReturnId(purchaseReturn.getId());

		returnItem.setPurchaseId(purchase.getId());

		returnItem.setPurchaseItemId(purchaseItem.getId());

		returnItem.setMedicineId(purchaseItem.getMedicineId());

		returnItem.setMedicineName(purchaseItem.getMedicineName());

		returnItem.setStockId(stock.getId());

		returnItem.setBatchNumber(stock.getBatchNumber());

		returnItem.setExpiryDate(stock.getExpiryDate());

		returnItem.setReturnQuantity(returnQuantity);

		returnItem.setPurchaseRate(calculatedItem.purchaseRate());

		returnItem.setGrossAmount(calculatedItem.grossAmount());

		returnItem.setDiscountPercentage(calculatedItem.discountPercentage());

		returnItem.setDiscountAmount(calculatedItem.discountAmount());

		returnItem.setTaxableAmount(calculatedItem.taxableAmount());

		returnItem.setGstPercentage(calculatedItem.gstPercentage());

		returnItem.setGstAmount(calculatedItem.gstAmount());

		returnItem.setLineTotal(calculatedItem.lineTotal());

		returnItem.setReturnReason(reason);

		returnItem.setReasonDetails(normalizeOptional(request.getReasonDetails()));

		returnItemRepository.save(returnItem);

		stock.setCurrentQuantity(currentQuantity - returnQuantity);

		stock.touch();

		stockRepository.save(stock);

		inventoryService.createMovement(tenantId, purchaseItem.getMedicineId(), stock.getId(),
				SaasStockMovementType.PURCHASE_RETURN, returnQuantity,
				buildMovementRemarks(purchaseReturn, reason, request.getReasonDetails()), purchaseReturn.getId());
	}

	private void validateReturnAvailability(Long tenantId, SaasPurchaseItem purchaseItem,
			SaasPurchaseReturnItemRequest request) {

		int totalReceived = safeInteger(purchaseItem.getQuantity()) + safeInteger(purchaseItem.getFreeQuantity());

		int previouslyReturned = safeLongToInteger(
				returnItemRepository.sumReturnedQuantityByPurchaseItem(tenantId, purchaseItem.getId()));

		int remainingReturnable = totalReceived - previouslyReturned;

		if (request.getReturnQuantity() > remainingReturnable) {

			throw new RuntimeException("Return quantity exceeds remaining returnable quantity for "
					+ purchaseItem.getMedicineName() + ". Remaining returnable: " + Math.max(remainingReturnable, 0));
		}

		SaasMedicineStock stock = stockRepository.findByIdAndTenantIdAndActiveTrue(request.getStockId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Stock batch not found"));

		validateStockMatchesPurchaseItem(purchaseItem, stock);

		int currentStock = safeInteger(stock.getCurrentQuantity());

		if (request.getReturnQuantity() > currentStock) {

			throw new RuntimeException("Return quantity exceeds current stock for batch " + stock.getBatchNumber()
					+ ". Current stock: " + currentStock);
		}
	}

	private void validateStockMatchesPurchaseItem(SaasPurchaseItem purchaseItem, SaasMedicineStock stock) {

		if (!purchaseItem.getMedicineId().equals(stock.getMedicineId())) {

			throw new RuntimeException("Selected stock does not belong to purchase item medicine");
		}

		String purchaseBatch = normalizeOptional(purchaseItem.getBatchNumber());

		String stockBatch = normalizeOptional(stock.getBatchNumber());

		if (purchaseBatch == null || stockBatch == null || !purchaseBatch.equalsIgnoreCase(stockBatch)) {

			throw new RuntimeException("Selected stock batch does not match purchase item batch");
		}
	}

	private SaasPurchaseReturnAvailabilityResponse toAvailabilityResponse(SaasPurchaseItem item) {

		SaasMedicineStock stock = stockRepository.findByTenantIdAndMedicineIdAndBatchNumberIgnoreCaseAndActiveTrue(
				item.getTenantId(), item.getMedicineId(), item.getBatchNumber()).orElse(null);

		int purchasedQuantity = safeInteger(item.getQuantity());

		int freeQuantity = safeInteger(item.getFreeQuantity());

		int totalReceived = purchasedQuantity + freeQuantity;

		int previouslyReturned = safeLongToInteger(
				returnItemRepository.sumReturnedQuantityByPurchaseItem(item.getTenantId(), item.getId()));

		int remainingReturnable = Math.max(totalReceived - previouslyReturned, 0);

		int currentStock = stock == null ? 0 : safeInteger(stock.getCurrentQuantity());

		int maximumReturnQuantity = Math.min(remainingReturnable, currentStock);

		return new SaasPurchaseReturnAvailabilityResponse(item.getId(), item.getMedicineId(), item.getMedicineName(),
				item.getMedicineType(), item.getManufacturer(), stock == null ? null : stock.getId(),
				item.getBatchNumber(), item.getExpiryDate(), purchasedQuantity, freeQuantity, totalReceived,
				previouslyReturned, remainingReturnable, currentStock, maximumReturnQuantity,
				money(item.getPurchaseRate()), money(item.getDiscountPercentage()), money(item.getGstPercentage()));
	}

	private CalculatedItem calculateItem(SaasPurchaseItem purchaseItem, Integer returnQuantity) {

		BigDecimal purchaseRate = money(purchaseItem.getPurchaseRate());

		BigDecimal discountPercentage = money(purchaseItem.getDiscountPercentage());

		BigDecimal gstPercentage = money(purchaseItem.getGstPercentage());

		BigDecimal quantity = BigDecimal.valueOf(returnQuantity);

		BigDecimal grossAmount = money(purchaseRate.multiply(quantity));

		BigDecimal discountAmount = money(
				grossAmount.multiply(discountPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal taxableAmount = money(grossAmount.subtract(discountAmount));

		BigDecimal gstAmount = money(taxableAmount.multiply(gstPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal lineTotal = money(taxableAmount.add(gstAmount));

		return new CalculatedItem(purchaseRate, discountPercentage, gstPercentage, grossAmount, discountAmount,
				taxableAmount, gstAmount, lineTotal);
	}

	private void validateRequest(SaasPurchaseReturnRequest request) {

		if (request == null) {
			throw new RuntimeException("Purchase return request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getPurchaseId() == null) {
			throw new RuntimeException("Purchase is required");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("At least one return item is required");
		}

		request.getItems().forEach(this::validateItemRequest);

		nonNegativeAmount(request.getOtherCharges(), "Other charges");
	}

	private void validateItemRequest(SaasPurchaseReturnItemRequest request) {

		if (request == null) {
			throw new RuntimeException("Purchase return item is required");
		}

		if (request.getPurchaseItemId() == null) {
			throw new RuntimeException("Purchase item is required");
		}

		if (request.getStockId() == null) {
			throw new RuntimeException("Stock batch is required");
		}

		if (request.getReturnQuantity() == null || request.getReturnQuantity() <= 0) {

			throw new RuntimeException("Return quantity must be greater than 0");
		}

		parseReturnReason(request.getReturnReason());
	}

	private SaasPurchase findPurchase(Long tenantId, Long purchaseId) {

		if (purchaseId == null) {
			throw new RuntimeException("Purchase id is required");
		}

		return purchaseRepository.findByIdAndTenantId(purchaseId, tenantId)
				.orElseThrow(() -> new RuntimeException("Purchase not found"));
	}

	private SaasPurchaseItem findPurchaseItem(Long tenantId, Long purchaseId, Long purchaseItemId) {

		return purchaseItemRepository.findByIdAndTenantIdAndPurchaseId(purchaseItemId, tenantId, purchaseId)
				.orElseThrow(() -> new RuntimeException("Purchase item not found"));
	}

	private SaasPurchaseReturn findReturn(Long tenantId, Long returnId) {

		if (returnId == null) {
			throw new RuntimeException("Purchase return id is required");
		}

		return returnRepository.findByIdAndTenantId(returnId, tenantId)
				.orElseThrow(() -> new RuntimeException("Purchase return not found"));
	}

	private SaasPurchaseReturnReason parseReturnReason(String value) {

		if (value == null || value.isBlank()) {
			throw new RuntimeException("Return reason is required");
		}

		try {

			return SaasPurchaseReturnReason.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid purchase return reason");
		}
	}

	private String buildMovementRemarks(SaasPurchaseReturn purchaseReturn, SaasPurchaseReturnReason reason,
			String reasonDetails) {

		String remarks = "Stock returned to supplier through " + purchaseReturn.getReturnNumber() + ". Reason: "
				+ reason.name();

		String details = normalizeOptional(reasonDetails);

		if (details != null) {
			remarks += ". " + details;
		}

		return remarks;
	}

	private SaasPurchaseReturnResponse toResponse(SaasPurchaseReturn purchaseReturn) {

		List<SaasPurchaseReturnItemResponse> items = returnItemRepository
				.findByTenantIdAndPurchaseReturnIdOrderByIdAsc(purchaseReturn.getTenantId(), purchaseReturn.getId())
				.stream().map(this::toItemResponse).toList();

		return new SaasPurchaseReturnResponse(purchaseReturn.getId(), purchaseReturn.getTenantId(),
				purchaseReturn.getReturnNumber(), purchaseReturn.getReturnDate(), purchaseReturn.getPurchaseId(),
				purchaseReturn.getPurchaseNumber(), purchaseReturn.getSupplierInvoiceNumber(),
				purchaseReturn.getSupplierId(), purchaseReturn.getSupplierCode(), purchaseReturn.getSupplierName(),
				purchaseReturn.getTotalQuantity(), purchaseReturn.getGrossAmount(), purchaseReturn.getDiscountAmount(),
				purchaseReturn.getTaxableAmount(), purchaseReturn.getGstAmount(), purchaseReturn.getOtherCharges(),
				purchaseReturn.getRoundOffAmount(), purchaseReturn.getGrandTotal(),
				purchaseReturn.getReturnStatus().name(), purchaseReturn.getDebitNoteNumber(),
				purchaseReturn.getRemarks(), purchaseReturn.getCreatedAt(), items);
	}

	private SaasPurchaseReturnItemResponse toItemResponse(SaasPurchaseReturnItem item) {

		return new SaasPurchaseReturnItemResponse(item.getId(), item.getPurchaseItemId(), item.getMedicineId(),
				item.getMedicineName(), item.getStockId(), item.getBatchNumber(), item.getExpiryDate(),
				item.getReturnQuantity(), item.getPurchaseRate(), item.getGrossAmount(), item.getDiscountPercentage(),
				item.getDiscountAmount(), item.getTaxableAmount(), item.getGstPercentage(), item.getGstAmount(),
				item.getLineTotal(), item.getReturnReason().name(), item.getReasonDetails());
	}

	private String generateReturnNumber(Long tenantId) {

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return "PRN-" + tenantId + "-" + timestamp + "-" + random;
	}

	private void validateWorkspace(Long tenantId) {

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().trim().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType) && !"RETAILER".equals(tenantType)) {

			throw new RuntimeException(
					"Purchase Returns module is available only for Wholesaler and Retailer workspaces");
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

	private int safeInteger(Integer value) {

		return value == null ? 0 : value;
	}

	private int safeLongToInteger(Long value) {

		if (value == null || value <= 0) {
			return 0;
		}

		if (value > Integer.MAX_VALUE) {
			return Integer.MAX_VALUE;
		}

		return value.intValue();
	}

	private Long safeLong(Long value) {

		return value == null ? 0L : value;
	}

	private String normalizeOptional(String value) {

		if (value == null) {
			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}

	private record CalculatedReturn(BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount,
			BigDecimal gstAmount, Integer totalQuantity) {
	}

	private record CalculatedItem(BigDecimal purchaseRate, BigDecimal discountPercentage, BigDecimal gstPercentage,
			BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount, BigDecimal gstAmount,
			BigDecimal lineTotal) {
	}
}