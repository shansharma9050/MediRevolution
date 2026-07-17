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
public class SaasSalesReturnService {

	private static final BigDecimal HUNDRED = new BigDecimal("100");

	private final SaasSalesReturnRepository returnRepository;
	private final SaasSalesReturnItemRepository returnItemRepository;
	private final SaasSaleRepository saleRepository;
	private final SaasSaleItemRepository saleItemRepository;
	private final SaasSaleStockAllocationRepository allocationRepository;
	private final SaasMedicineStockRepository stockRepository;
	private final SaasInventoryService inventoryService;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasPartyLedgerService ledgerService;
	

	public SaasSalesReturnService(SaasSalesReturnRepository returnRepository,
			SaasSalesReturnItemRepository returnItemRepository, SaasSaleRepository saleRepository,
			SaasSaleItemRepository saleItemRepository, SaasSaleStockAllocationRepository allocationRepository,
			SaasMedicineStockRepository stockRepository, SaasInventoryService inventoryService,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,SaasPartyLedgerService ledgerService) {
		this.returnRepository = returnRepository;
		this.returnItemRepository = returnItemRepository;
		this.saleRepository = saleRepository;
		this.saleItemRepository = saleItemRepository;
		this.allocationRepository = allocationRepository;
		this.stockRepository = stockRepository;
		this.inventoryService = inventoryService;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.ledgerService=ledgerService;
		
	}

	public List<SaasSalesReturnResponse> getReturns(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_RETURNS, SaasPermissionAction.VIEW);

		return returnRepository.findByTenantIdOrderByReturnDateDescCreatedAtDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	public List<SaasSalesReturnResponse> searchReturns(Long tenantId, String keyword) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_RETURNS, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {
			return getReturns(tenantId);
		}

		return returnRepository.searchReturns(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	public SaasSalesReturnResponse getReturn(Long tenantId, Long returnId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_RETURNS, SaasPermissionAction.VIEW);

		return toResponse(findReturn(tenantId, returnId));
	}

	public SaasSalesReturnSummaryResponse getSummary(Long tenantId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_RETURNS, SaasPermissionAction.VIEW);

		return new SaasSalesReturnSummaryResponse(
				returnRepository.countByTenantIdAndReturnStatusNot(tenantId, SaasSalesReturnStatus.CANCELLED),
				safeLong(returnRepository.sumReturnedQuantity(tenantId)),
				money(returnRepository.sumReturnAmount(tenantId)), money(returnRepository.sumRefundedAmount(tenantId)),
				money(returnRepository.sumPendingRefundAmount(tenantId)));
	}

	public List<SaasSalesReturnAvailabilityResponse> getSaleReturnAvailability(Long tenantId, Long saleId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_RETURNS, SaasPermissionAction.VIEW);

		SaasSale sale = findSale(tenantId, saleId);

		if (SaasSaleStatus.CANCELLED.equals(sale.getSaleStatus())) {
			throw new RuntimeException("Cancelled sale cannot be returned");
		}

		return allocationRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId, saleId).stream()
				.map(allocation -> toAvailabilityResponse(tenantId, allocation)).toList();
	}

	@Transactional
	public SaasSalesReturnResponse createReturn(SaasSalesReturnRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_RETURNS, SaasPermissionAction.CREATE);

		SaasSale sale = findSale(tenantId, request.getSaleId());

		if (SaasSaleStatus.CANCELLED.equals(sale.getSaleStatus())) {
			throw new RuntimeException("Cancelled sale cannot be returned");
		}

		LocalDate returnDate = request.getReturnDate() == null ? LocalDate.now() : request.getReturnDate();

		if (sale.getSaleDate() != null && returnDate.isBefore(sale.getSaleDate())) {
			throw new RuntimeException("Return date cannot be before sale date");
		}

		Set<Long> allocationIds = new HashSet<>();

		CalculatedReturn calculated = calculateReturn(tenantId, sale, request, allocationIds);

		BigDecimal otherAdjustment = money(request.getOtherAdjustment());

		BigDecimal roundOff = money(request.getRoundOffAmount());

		BigDecimal grandTotal = money(
				calculated.taxableAmount().add(calculated.gstAmount()).add(otherAdjustment).add(roundOff));

		if (grandTotal.compareTo(BigDecimal.ZERO) < 0) {
			throw new RuntimeException("Return grand total cannot be negative");
		}

		BigDecimal refundedAmount = nonNegativeAmount(request.getRefundedAmount(), "Refunded amount");

		if (refundedAmount.compareTo(grandTotal) > 0) {
			throw new RuntimeException("Refunded amount cannot exceed return grand total");
		}

		boolean adjusted = Boolean.TRUE.equals(request.getAdjustInCustomerAccount());

		BigDecimal pendingRefundAmount = adjusted ? BigDecimal.ZERO.setScale(2)
				: money(grandTotal.subtract(refundedAmount));

		SaasSalesReturn salesReturn = new SaasSalesReturn();

		salesReturn.setTenantId(tenantId);
		salesReturn.setReturnNumber(generateReturnNumber(tenantId));
		salesReturn.setReturnDate(returnDate);

		salesReturn.setSaleId(sale.getId());
		salesReturn.setSaleNumber(sale.getSaleNumber());
		salesReturn.setSaleDate(sale.getSaleDate());

		salesReturn.setCustomerId(sale.getCustomerId());
		salesReturn.setCustomerCode(sale.getCustomerCode());
		salesReturn.setCustomerName(sale.getCustomerName());
		salesReturn.setCustomerGstin(sale.getCustomerGstin());

		salesReturn.setCreditNoteNumber(normalizeOptional(request.getCreditNoteNumber()));

		salesReturn.setTotalQuantity(calculated.totalQuantity());
		salesReturn.setGrossAmount(calculated.grossAmount());
		salesReturn.setDiscountAmount(calculated.discountAmount());
		salesReturn.setTaxableAmount(calculated.taxableAmount());
		salesReturn.setGstAmount(calculated.gstAmount());

		salesReturn.setOtherAdjustment(otherAdjustment);
		salesReturn.setRoundOffAmount(roundOff);
		salesReturn.setGrandTotal(grandTotal);

		salesReturn.setRefundedAmount(adjusted ? BigDecimal.ZERO.setScale(2) : refundedAmount);

		salesReturn.setPendingRefundAmount(pendingRefundAmount);

		salesReturn.setRefundStatus(resolveRefundStatus(grandTotal, refundedAmount, adjusted));

		salesReturn.setReturnStatus(SaasSalesReturnStatus.POSTED);

		salesReturn.setRemarks(normalizeOptional(request.getRemarks()));

		salesReturn.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesReturn savedReturn = returnRepository.save(salesReturn);

		for (SaasSalesReturnItemRequest itemRequest
		        : request.getItems()) {

		    processReturnItem(
		            tenantId,
		            sale,
		            savedReturn,
		            itemRequest
		    );
		}

		ledgerService.postLedgerEntry(
		        savedReturn.getTenantId(),
		        SaasPaymentPartyType.CUSTOMER,
		        savedReturn.getCustomerId(),
		        savedReturn.getCustomerCode(),
		        savedReturn.getCustomerName(),
		        savedReturn.getReturnDate(),
		        SaasLedgerEntryType.SALES_RETURN,
		        "SALES_RETURN",
		        savedReturn.getId(),
		        savedReturn.getReturnNumber(),
		        BigDecimal.ZERO,
		        savedReturn.getGrandTotal(),
		        "Sales return posted: "
		                + savedReturn.getReturnNumber()
		);

		return toResponse(savedReturn);
	}

	private CalculatedReturn calculateReturn(Long tenantId, SaasSale sale, SaasSalesReturnRequest request,
			Set<Long> allocationIds) {

		BigDecimal grossAmount = BigDecimal.ZERO;

		BigDecimal discountAmount = BigDecimal.ZERO;

		BigDecimal taxableAmount = BigDecimal.ZERO;

		BigDecimal gstAmount = BigDecimal.ZERO;

		int totalQuantity = 0;

		for (SaasSalesReturnItemRequest itemRequest : request.getItems()) {

			validateItemRequest(itemRequest);

			if (!allocationIds.add(itemRequest.getSaleStockAllocationId())) {
				throw new RuntimeException("Duplicate sale batch allocations are not allowed");
			}

			SaasSaleStockAllocation allocation = findAllocation(tenantId, sale.getId(),
					itemRequest.getSaleStockAllocationId());

			SaasSaleItem saleItem = findSaleItem(tenantId, sale.getId(), allocation.getSaleItemId());

			validateReturnableQuantity(tenantId, allocation, itemRequest.getReturnQuantity());

			CalculatedItem item = calculateItem(saleItem, itemRequest.getReturnQuantity());

			grossAmount = grossAmount.add(item.grossAmount());

			discountAmount = discountAmount.add(item.discountAmount());

			taxableAmount = taxableAmount.add(item.taxableAmount());

			gstAmount = gstAmount.add(item.gstAmount());

			totalQuantity += itemRequest.getReturnQuantity();
		}

		return new CalculatedReturn(money(grossAmount), money(discountAmount), money(taxableAmount), money(gstAmount),
				totalQuantity);
	}

	private void processReturnItem(Long tenantId, SaasSale sale, SaasSalesReturn salesReturn,
			SaasSalesReturnItemRequest request) {

		SaasSaleStockAllocation allocation = findAllocation(tenantId, sale.getId(), request.getSaleStockAllocationId());

		SaasSaleItem saleItem = findSaleItem(tenantId, sale.getId(), allocation.getSaleItemId());

		validateReturnableQuantity(tenantId, allocation, request.getReturnQuantity());

		SaasMedicineStock stock = stockRepository.findStockForUpdate(allocation.getStockId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Original sale stock batch not found"));

		if (!stock.getMedicineId().equals(allocation.getMedicineId())) {
			throw new RuntimeException("Stock medicine does not match sale allocation");
		}

		if (!equalsIgnoreCase(stock.getBatchNumber(), allocation.getBatchNumber())) {
			throw new RuntimeException("Stock batch does not match sale allocation");
		}

		int returnQuantity = request.getReturnQuantity();

		CalculatedItem calculatedItem = calculateItem(saleItem, returnQuantity);

		SaasSalesReturnReason reason = parseReturnReason(request.getReturnReason());

		SaasSalesReturnItem returnItem = new SaasSalesReturnItem();

		returnItem.setTenantId(tenantId);
		returnItem.setSalesReturnId(salesReturn.getId());
		returnItem.setSaleId(sale.getId());
		returnItem.setSaleItemId(saleItem.getId());
		returnItem.setSaleStockAllocationId(allocation.getId());

		returnItem.setMedicineId(saleItem.getMedicineId());
		returnItem.setMedicineName(saleItem.getMedicineName());

		returnItem.setStockId(stock.getId());
		returnItem.setBatchNumber(stock.getBatchNumber());
		returnItem.setExpiryDate(stock.getExpiryDate());

		returnItem.setReturnQuantity(returnQuantity);

		returnItem.setSaleRate(calculatedItem.saleRate());
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

		int currentQuantity = safeInteger(stock.getCurrentQuantity());

		stock.setCurrentQuantity(currentQuantity + returnQuantity);

		stock.touch();

		stockRepository.save(stock);

		inventoryService.createMovement(tenantId, saleItem.getMedicineId(), stock.getId(),
				SaasStockMovementType.SALES_RETURN, returnQuantity,
				buildMovementRemarks(salesReturn, reason, request.getReasonDetails()), salesReturn.getId());
	}

	private void validateReturnableQuantity(Long tenantId, SaasSaleStockAllocation allocation,
			Integer requestedQuantity) {

		int soldQuantity = safeInteger(allocation.getAllocatedQuantity());

		int previouslyReturned = safeLongToInteger(
				returnItemRepository.sumReturnedQuantityByAllocation(tenantId, allocation.getId()));

		int remaining = soldQuantity - previouslyReturned;

		if (requestedQuantity > remaining) {
			throw new RuntimeException("Return quantity exceeds remaining returnable quantity for batch "
					+ allocation.getBatchNumber() + ". Remaining: " + Math.max(remaining, 0));
		}
	}

	private SaasSalesReturnAvailabilityResponse toAvailabilityResponse(Long tenantId,
			SaasSaleStockAllocation allocation) {

		SaasSaleItem saleItem = findSaleItem(tenantId, allocation.getSaleId(), allocation.getSaleItemId());

		int soldQuantity = safeInteger(allocation.getAllocatedQuantity());

		int previouslyReturned = safeLongToInteger(
				returnItemRepository.sumReturnedQuantityByAllocation(tenantId, allocation.getId()));

		int remaining = Math.max(soldQuantity - previouslyReturned, 0);

		return new SaasSalesReturnAvailabilityResponse(saleItem.getId(), allocation.getId(), saleItem.getMedicineId(),
				saleItem.getMedicineName(), saleItem.getMedicineType(), saleItem.getManufacturer(),
				allocation.getStockId(), allocation.getBatchNumber(), allocation.getExpiryDate(), soldQuantity,
				previouslyReturned, remaining, money(saleItem.getSaleRate()), money(saleItem.getDiscountPercentage()),
				money(saleItem.getGstPercentage()));
	}

	private CalculatedItem calculateItem(SaasSaleItem saleItem, Integer returnQuantity) {

		BigDecimal saleRate = money(saleItem.getSaleRate());

		BigDecimal discountPercentage = validPercentage(saleItem.getDiscountPercentage(), "Discount percentage");

		BigDecimal gstPercentage = validPercentage(saleItem.getGstPercentage(), "GST percentage");

		BigDecimal quantity = BigDecimal.valueOf(returnQuantity);

		BigDecimal grossAmount = money(saleRate.multiply(quantity));

		BigDecimal discountAmount = money(
				grossAmount.multiply(discountPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal taxableAmount = money(grossAmount.subtract(discountAmount));

		BigDecimal gstAmount = money(taxableAmount.multiply(gstPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal lineTotal = money(taxableAmount.add(gstAmount));

		return new CalculatedItem(saleRate, discountPercentage, gstPercentage, grossAmount, discountAmount,
				taxableAmount, gstAmount, lineTotal);
	}

	private void validateRequest(SaasSalesReturnRequest request) {

		if (request == null) {
			throw new RuntimeException("Sales return request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getSaleId() == null) {
			throw new RuntimeException("Sale is required");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {
			throw new RuntimeException("At least one sales return item is required");
		}

		request.getItems().forEach(this::validateItemRequest);

		nonNegativeAmount(request.getRefundedAmount(), "Refunded amount");
	}

	private void validateItemRequest(SaasSalesReturnItemRequest request) {

		if (request == null) {
			throw new RuntimeException("Sales return item is required");
		}

		if (request.getSaleStockAllocationId() == null) {
			throw new RuntimeException("Sale stock allocation is required");
		}

		if (request.getReturnQuantity() == null || request.getReturnQuantity() <= 0) {

			throw new RuntimeException("Return quantity must be greater than 0");
		}

		SaasSalesReturnReason reason = parseReturnReason(request.getReturnReason());

		if (SaasSalesReturnReason.OTHER.equals(reason) && normalizeOptional(request.getReasonDetails()) == null) {

			throw new RuntimeException("Reason details are required when return reason is OTHER");
		}
	}

	private SaasSale findSale(Long tenantId, Long saleId) {

		return saleRepository.findByIdAndTenantId(saleId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sale not found"));
	}

	private SaasSaleItem findSaleItem(Long tenantId, Long saleId, Long saleItemId) {

		return saleItemRepository.findByTenantIdAndSaleIdOrderByIdAsc(tenantId, saleId).stream()
				.filter(item -> item.getId().equals(saleItemId)).findFirst()
				.orElseThrow(() -> new RuntimeException("Sale item not found"));
	}

	private SaasSaleStockAllocation findAllocation(Long tenantId, Long saleId, Long allocationId) {

		return allocationRepository.findByIdAndTenantIdAndSaleId(allocationId, tenantId, saleId)
				.orElseThrow(() -> new RuntimeException("Sale batch allocation not found"));
	}

	private SaasSalesReturn findReturn(Long tenantId, Long returnId) {

		return returnRepository.findByIdAndTenantId(returnId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sales return not found"));
	}

	private SaasSalesReturnReason parseReturnReason(String value) {

		if (value == null || value.isBlank()) {
			throw new RuntimeException("Return reason is required");
		}

		try {
			return SaasSalesReturnReason.valueOf(value.trim().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException exception) {
			throw new RuntimeException("Invalid sales return reason");
		}
	}

	private SaasSalesReturnRefundStatus resolveRefundStatus(BigDecimal grandTotal, BigDecimal refundedAmount,
			boolean adjusted) {

		if (adjusted) {
			return SaasSalesReturnRefundStatus.ADJUSTED;
		}

		if (refundedAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return SaasSalesReturnRefundStatus.NOT_REFUNDED;
		}

		if (refundedAmount.compareTo(grandTotal) >= 0) {
			return SaasSalesReturnRefundStatus.REFUNDED;
		}

		return SaasSalesReturnRefundStatus.PARTIALLY_REFUNDED;
	}

	private String buildMovementRemarks(SaasSalesReturn salesReturn, SaasSalesReturnReason reason, String details) {

		String remarks = "Customer sales return through " + salesReturn.getReturnNumber() + ". Reason: "
				+ reason.name();

		String normalizedDetails = normalizeOptional(details);

		if (normalizedDetails != null) {
			remarks += ". " + normalizedDetails;
		}

		return remarks;
	}

	private SaasSalesReturnResponse toResponse(SaasSalesReturn salesReturn) {

		List<SaasSalesReturnItemResponse> items = returnItemRepository
				.findByTenantIdAndSalesReturnIdOrderByIdAsc(salesReturn.getTenantId(), salesReturn.getId()).stream()
				.map(this::toItemResponse).toList();

		return new SaasSalesReturnResponse(salesReturn.getId(), salesReturn.getTenantId(),
				salesReturn.getReturnNumber(), salesReturn.getReturnDate(), salesReturn.getSaleId(),
				salesReturn.getSaleNumber(), salesReturn.getSaleDate(), salesReturn.getCustomerId(),
				salesReturn.getCustomerCode(), salesReturn.getCustomerName(), salesReturn.getCustomerGstin(),
				salesReturn.getCreditNoteNumber(), salesReturn.getTotalQuantity(), salesReturn.getGrossAmount(),
				salesReturn.getDiscountAmount(), salesReturn.getTaxableAmount(), salesReturn.getGstAmount(),
				salesReturn.getOtherAdjustment(), salesReturn.getRoundOffAmount(), salesReturn.getGrandTotal(),
				salesReturn.getRefundedAmount(), salesReturn.getPendingRefundAmount(),
				salesReturn.getRefundStatus().name(), salesReturn.getReturnStatus().name(), salesReturn.getRemarks(),
				salesReturn.getCreatedAt(), items);
	}

	private SaasSalesReturnItemResponse toItemResponse(SaasSalesReturnItem item) {

		return new SaasSalesReturnItemResponse(item.getId(), item.getSaleItemId(), item.getSaleStockAllocationId(),
				item.getMedicineId(), item.getMedicineName(), item.getStockId(), item.getBatchNumber(),
				item.getExpiryDate(), item.getReturnQuantity(), item.getSaleRate(), item.getGrossAmount(),
				item.getDiscountPercentage(), item.getDiscountAmount(), item.getTaxableAmount(),
				item.getGstPercentage(), item.getGstAmount(), item.getLineTotal(), item.getReturnReason().name(),
				item.getReasonDetails());
	}

	private String generateReturnNumber(Long tenantId) {

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return "SRN-" + tenantId + "-" + timestamp + "-" + random;
	}

	private void validateWorkspace(Long tenantId) {
		
		  if (tenantId == null) {
		        throw new RuntimeException(
		                "tenantId is required"
		        );
		    }

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().trim().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType) && !"RETAILER".equals(tenantType)) {
			throw new RuntimeException("Sales Returns module is available only for Wholesaler and Retailer workspaces");
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

	private boolean equalsIgnoreCase(String first, String second) {

		if (first == null || second == null) {
			return first == null && second == null;
		}

		return first.trim().equalsIgnoreCase(second.trim());
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

	private record CalculatedItem(BigDecimal saleRate, BigDecimal discountPercentage, BigDecimal gstPercentage,
			BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount, BigDecimal gstAmount,
			BigDecimal lineTotal) {
	}
}