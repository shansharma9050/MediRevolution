package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasExpiryActionRequest;
import com.example.medi.saas.dto.SaasExpiryActionResponse;
import com.example.medi.saas.dto.SaasExpiryAlertResponse;
import com.example.medi.saas.dto.SaasExpiryBatchResponse;
import com.example.medi.saas.dto.SaasExpirySearchRequest;
import com.example.medi.saas.dto.SaasExpirySummaryResponse;
import com.example.medi.saas.dto.SaasSupplierExpiryResponse;
import com.example.medi.saas.entity.SaasExpiryAction;
import com.example.medi.saas.entity.SaasExpiryConfiguration;
import com.example.medi.saas.entity.SaasMedicineStock;
import com.example.medi.saas.entity.SaasPurchaseReturn;
import com.example.medi.saas.enums.SaasExpiryActionStatus;
import com.example.medi.saas.enums.SaasExpiryActionType;
import com.example.medi.saas.enums.SaasExpiryAdjustmentReason;
import com.example.medi.saas.enums.SaasExpiryBatchStatus;
import com.example.medi.saas.enums.SaasExpiryDisposalMethod;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStockMovementType;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasExpiryActionRepository;
import com.example.medi.saas.repository.SaasMedicineStockRepository;
import com.example.medi.saas.repository.SaasPurchaseReturnRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class SaasExpiryManagementService {

	private final SaasMedicineStockRepository stockRepository;
	private final SaasExpiryActionRepository actionRepository;
	private final SaasPurchaseReturnRepository purchaseReturnRepository;
	private final SaasExpiryConfigurationService configurationService;
	private final SaasInventoryService inventoryService;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;

	public SaasExpiryManagementService(SaasMedicineStockRepository stockRepository,
			SaasExpiryActionRepository actionRepository, SaasPurchaseReturnRepository purchaseReturnRepository,
			SaasExpiryConfigurationService configurationService, SaasInventoryService inventoryService,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService) {
		this.stockRepository = stockRepository;
		this.actionRepository = actionRepository;
		this.purchaseReturnRepository = purchaseReturnRepository;
		this.configurationService = configurationService;
		this.inventoryService = inventoryService;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
	}

	public List<SaasExpiryBatchResponse> getAllTrackedBatches(Long tenantId) {

		validateViewAccess(tenantId);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		return loadFilteredBatches(tenantId, configuration, null, null, null, null,
				configuration.getIncludeZeroStockBatches());
	}

	public List<SaasExpiryBatchResponse> getExpiredBatches(Long tenantId) {

		validateViewAccess(tenantId);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		return loadFilteredBatches(tenantId, configuration, SaasExpiryBatchStatus.EXPIRED, null, null, null,
				configuration.getIncludeZeroStockBatches());
	}

	public List<SaasExpiryBatchResponse> getExpiringTodayBatches(Long tenantId) {

		validateViewAccess(tenantId);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		return loadFilteredBatches(tenantId, configuration, SaasExpiryBatchStatus.EXPIRES_TODAY, null, null, null,
				configuration.getIncludeZeroStockBatches());
	}

	public List<SaasExpiryBatchResponse> getCriticalBatches(Long tenantId) {

		validateViewAccess(tenantId);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		return loadFilteredBatches(tenantId, configuration, SaasExpiryBatchStatus.CRITICAL, null, null, null,
				configuration.getIncludeZeroStockBatches());
	}

	public List<SaasExpiryBatchResponse> getNearExpiryBatches(Long tenantId) {

		validateViewAccess(tenantId);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		return loadFilteredBatches(tenantId, configuration, SaasExpiryBatchStatus.NEAR_EXPIRY, null, null, null,
				configuration.getIncludeZeroStockBatches());
	}

	public List<SaasExpiryBatchResponse> searchBatches(SaasExpirySearchRequest request) {

		validateSearchRequest(request);

		Long tenantId = request.getTenantId();

		validateViewAccess(tenantId);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		SaasExpiryBatchStatus status = parseOptionalExpiryStatus(request.getExpiryStatus());

		Boolean includeZeroStock = request.getIncludeZeroStock() == null ? configuration.getIncludeZeroStockBatches()
				: request.getIncludeZeroStock();

		return loadFilteredBatches(tenantId, configuration, status, normalizeOptional(request.getKeyword()),
				request.getSupplierId(), request.getDays(), includeZeroStock);
	}

	public SaasExpirySummaryResponse getSummary(Long tenantId) {

		validateViewAccess(tenantId);

		List<SaasExpiryBatchResponse> batches = getAllTrackedBatchesInternal(tenantId);

		long expiredBatches = countByStatus(batches, SaasExpiryBatchStatus.EXPIRED);

		long expiresTodayBatches = countByStatus(batches, SaasExpiryBatchStatus.EXPIRES_TODAY);

		long criticalBatches = countByStatus(batches, SaasExpiryBatchStatus.CRITICAL);

		long nearExpiryBatches = countByStatus(batches, SaasExpiryBatchStatus.NEAR_EXPIRY);

		int expiredQuantity = batches.stream()
				.filter(item -> SaasExpiryBatchStatus.EXPIRED.name().equals(item.getExpiryStatus()))
				.mapToInt(item -> safeInteger(item.getCurrentQuantity())).sum();

		int nearExpiryQuantity = batches.stream().filter(this::isAtRiskButNotExpired)
				.mapToInt(item -> safeInteger(item.getAvailableQuantity())).sum();

		BigDecimal expiredValue = batches.stream()
				.filter(item -> SaasExpiryBatchStatus.EXPIRED.name().equals(item.getExpiryStatus()))
				.map(SaasExpiryBatchResponse::getStockValueAtRisk).map(this::money)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal nearExpiryValue = batches.stream().filter(this::isAtRiskButNotExpired)
				.map(SaasExpiryBatchResponse::getStockValueAtRisk).map(this::money)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		long suppliersAffected = batches.stream().filter(this::isActionRequired)
				.map(SaasExpiryBatchResponse::getSupplierId).filter(Objects::nonNull).distinct().count();

		long pendingActionBatches = batches.stream().filter(this::isActionRequired).count();

		return new SaasExpirySummaryResponse((long) batches.size(), expiredBatches, expiresTodayBatches,
				criticalBatches, nearExpiryBatches, expiredQuantity, nearExpiryQuantity, money(expiredValue),
				money(nearExpiryValue), money(expiredValue.add(nearExpiryValue)), suppliersAffected,
				pendingActionBatches);
	}

	public List<SaasSupplierExpiryResponse> getSupplierWiseExpiry(Long tenantId) {

		validateViewAccess(tenantId);

		List<SaasExpiryBatchResponse> batches = getAllTrackedBatchesInternal(tenantId).stream()
				.filter(this::isActionRequired).filter(item -> item.getSupplierId() != null).toList();

		Map<Long, List<SaasExpiryBatchResponse>> grouped = new LinkedHashMap<>();

		for (SaasExpiryBatchResponse item : batches) {

			grouped.computeIfAbsent(item.getSupplierId(), ignored -> new ArrayList<>()).add(item);
		}

		return grouped.entrySet().stream().map(entry -> buildSupplierExpiryResponse(entry.getKey(), entry.getValue()))
				.sorted(Comparator.comparing(SaasSupplierExpiryResponse::getStockValueAtRisk,
						Comparator.reverseOrder()))
				.toList();
	}

	public List<SaasExpiryAlertResponse> getAlerts(Long tenantId) {

		validateViewAccess(tenantId);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		if (!Boolean.TRUE.equals(configuration.getAlertEnabled())) {
			return List.of();
		}

		SaasExpirySummaryResponse summary = getSummaryInternal(tenantId);

		List<SaasExpiryAlertResponse> alerts = new ArrayList<>();

		if (summary.getExpiredBatches() > 0) {

			alerts.add(new SaasExpiryAlertResponse("DANGER", "Expired stock requires immediate action",
					summary.getExpiredBatches() + " expired batches containing " + summary.getExpiredQuantity()
							+ " units require disposal, quarantine or supplier return.",
					summary.getExpiredBatches(), summary.getExpiredQuantity(), summary.getExpiredStockValue(),
					"/saas/expiry-management?status=EXPIRED"));
		}

		if (summary.getExpiresTodayBatches() > 0) {

			alerts.add(new SaasExpiryAlertResponse("DANGER", "Stock expires today",
					summary.getExpiresTodayBatches() + " batches expire today and must not be sold.",
					summary.getExpiresTodayBatches(),
					calculateQuantityForStatus(tenantId, SaasExpiryBatchStatus.EXPIRES_TODAY),
					calculateValueForStatus(tenantId, SaasExpiryBatchStatus.EXPIRES_TODAY),
					"/saas/expiry-management?status=EXPIRES_TODAY"));
		}

		if (summary.getCriticalBatches() > 0) {

			alerts.add(new SaasExpiryAlertResponse("WARNING", "Critical near-expiry stock",
					summary.getCriticalBatches() + " batches are within the configured critical-expiry period.",
					summary.getCriticalBatches(), calculateQuantityForStatus(tenantId, SaasExpiryBatchStatus.CRITICAL),
					calculateValueForStatus(tenantId, SaasExpiryBatchStatus.CRITICAL),
					"/saas/expiry-management?status=CRITICAL"));
		}

		if (summary.getNearExpiryBatches() > 0) {

			alerts.add(new SaasExpiryAlertResponse("INFO", "Near-expiry stock detected",
					summary.getNearExpiryBatches() + " batches are approaching expiry.", summary.getNearExpiryBatches(),
					calculateQuantityForStatus(tenantId, SaasExpiryBatchStatus.NEAR_EXPIRY),
					calculateValueForStatus(tenantId, SaasExpiryBatchStatus.NEAR_EXPIRY),
					"/saas/expiry-management?status=NEAR_EXPIRY"));
		}

		return alerts;
	}

	public List<SaasExpiryActionResponse> getActions(Long tenantId) {

		validateViewAccess(tenantId);

		return actionRepository.findByTenantIdOrderByActionDateDescCreatedAtDesc(tenantId).stream()
				.map(this::toActionResponse).toList();
	}

	public List<SaasExpiryActionResponse> searchActions(Long tenantId, String keyword) {

		validateViewAccess(tenantId);

		if (keyword == null || keyword.isBlank()) {
			return getActions(tenantId);
		}

		return actionRepository.searchActions(tenantId, keyword.trim()).stream().map(this::toActionResponse).toList();
	}

	public SaasExpiryActionResponse getAction(Long tenantId, Long actionId) {

		validateViewAccess(tenantId);

		return toActionResponse(findAction(tenantId, actionId));
	}

	@Transactional
	public SaasExpiryActionResponse createAction(SaasExpiryActionRequest request) {

		validateActionRequest(request);

		Long tenantId = request.getTenantId();

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.EXPIRY_MANAGEMENT, SaasPermissionAction.CREATE);

		return createActionInternal(request);
	}

	@Transactional
	public Long autoQuarantineExpiredStock(Long tenantId) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.EXPIRY_MANAGEMENT, SaasPermissionAction.UPDATE);

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		if (!Boolean.TRUE.equals(configuration.getAutoQuarantineExpiredStock())) {
			return 0L;
		}

		List<SaasMedicineStock> stocks = stockRepository.findByTenantIdAndActiveTrueOrderByExpiryDateAsc(tenantId);

		long affected = 0L;

		for (SaasMedicineStock stock : stocks) {

			if (stock.getExpiryDate() == null || !stock.getExpiryDate().isBefore(LocalDate.now())) {
				continue;
			}

			int currentQuantity = safeInteger(stock.getCurrentQuantity());

			int quarantined = normalizeQuarantinedQuantity(stock, currentQuantity);

			int remaining = currentQuantity - quarantined;

			if (remaining <= 0) {
				continue;
			}

			SaasExpiryActionRequest request = new SaasExpiryActionRequest();

			request.setTenantId(tenantId);
			request.setStockId(stock.getId());
			request.setActionDate(LocalDate.now());
			request.setActionType(SaasExpiryActionType.QUARANTINE.name());
			request.setQuantity(remaining);
			request.setReasonDetails("Automatically quarantined because the batch has expired");
			request.setRemarks("System-generated expiry quarantine");

			createActionInternal(request);

			affected++;
		}

		return affected;
	}

	private void applyStockAction(SaasExpiryActionType actionType, SaasExpiryActionRequest request,
			SaasMedicineStock stock, SaasExpiryAction action) {

		int currentQuantity = safeInteger(stock.getCurrentQuantity());

		int quarantinedQuantity = normalizeQuarantinedQuantity(stock, currentQuantity);

		int actionQuantity = request.getQuantity();

		switch (actionType) {

		case RETURN_TO_SUPPLIER -> {

			linkPurchaseReturn(request, action, stock);

			if (request.getPurchaseReturnId() != null) {

				action.setQuantityAfter(currentQuantity);

			} else {

				int availableQuantity = currentQuantity - quarantinedQuantity;

				if (actionQuantity > availableQuantity) {

					throw new RuntimeException("Return quantity cannot exceed available non-quarantined stock");
				}

				int quantityAfter = currentQuantity - actionQuantity;

				stock.setCurrentQuantity(quantityAfter);

				if (safeInteger(stock.getQuarantinedQuantity()) > quantityAfter) {

					stock.setQuarantinedQuantity(quantityAfter);
				}

				stock.setExpiryQuarantined(safeInteger(stock.getQuarantinedQuantity()) > 0);

				action.setQuantityAfter(quantityAfter);
			}
		}

		case DISPOSAL, STOCK_ADJUSTMENT -> {

			int availableQuantity = currentQuantity - quarantinedQuantity;

			if (actionQuantity > availableQuantity) {

				throw new RuntimeException("Action quantity cannot exceed available non-quarantined stock");
			}

			int quantityAfter = currentQuantity - actionQuantity;

			stock.setCurrentQuantity(quantityAfter);

			if (safeInteger(stock.getQuarantinedQuantity()) > quantityAfter) {

				stock.setQuarantinedQuantity(quantityAfter);
			}

			stock.setExpiryQuarantined(safeInteger(stock.getQuarantinedQuantity()) > 0);

			action.setQuantityAfter(quantityAfter);
		}

		case QUARANTINE -> {

			int availableQuantity = currentQuantity - quarantinedQuantity;

			if (actionQuantity > availableQuantity) {

				throw new RuntimeException("Quarantine quantity cannot exceed available stock");
			}

			int newQuarantinedQuantity = quarantinedQuantity + actionQuantity;

			stock.setQuarantinedQuantity(newQuarantinedQuantity);

			stock.setExpiryQuarantined(newQuarantinedQuantity > 0);

			action.setQuantityAfter(currentQuantity);
		}

		case RELEASE_FROM_QUARANTINE -> {

			if (actionQuantity > quarantinedQuantity) {

				throw new RuntimeException("Release quantity cannot exceed quarantined quantity");
			}

			int newQuarantinedQuantity = quarantinedQuantity - actionQuantity;

			stock.setQuarantinedQuantity(newQuarantinedQuantity);

			stock.setExpiryQuarantined(newQuarantinedQuantity > 0);

			action.setQuantityAfter(currentQuantity);
		}
		}

		stock.touch();
	}

	private void linkPurchaseReturn(SaasExpiryActionRequest request, SaasExpiryAction action, SaasMedicineStock stock) {

		if (request.getPurchaseReturnId() == null) {
			return;
		}

		SaasPurchaseReturn purchaseReturn = purchaseReturnRepository
				.findByIdAndTenantId(request.getPurchaseReturnId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Linked purchase return not found"));

		if (stock.getSupplierId() != null && purchaseReturn.getSupplierId() != null
				&& !stock.getSupplierId().equals(purchaseReturn.getSupplierId())) {
			throw new RuntimeException("Purchase return supplier does not match the expiry stock supplier");
		}

		if (stock.getPurchaseId() != null && purchaseReturn.getPurchaseId() != null
				&& !stock.getPurchaseId().equals(purchaseReturn.getPurchaseId())) {
			throw new RuntimeException("Purchase return does not belong to the stock purchase");
		}

		action.setPurchaseReturnId(purchaseReturn.getId());

		action.setPurchaseReturnNumber(purchaseReturn.getReturnNumber());
	}

	private SaasExpiryAction buildBaseAction(Long tenantId, SaasMedicineStock stock, SaasExpiryActionType actionType,
			LocalDate actionDate, Integer actionQuantity, Integer quantityBefore, SaasExpiryActionRequest request) {

		SaasExpiryAction action = new SaasExpiryAction();

		action.setTenantId(tenantId);

		action.setActionNumber(generateActionNumber(tenantId, actionType));

		action.setActionDate(actionDate);

		action.setActionType(actionType);

		action.setActionStatus(SaasExpiryActionStatus.POSTED);

		action.setStockId(stock.getId());

		action.setMedicineId(stock.getMedicineId());

		action.setMedicineName(defaultText(stock.getMedicineName(), "Medicine"));

		action.setBatchNumber(defaultText(stock.getBatchNumber(), "NA"));

		action.setExpiryDate(stock.getExpiryDate());

		action.setSupplierId(stock.getSupplierId());

		action.setSupplierCode(stock.getSupplierCode());

		action.setSupplierName(stock.getSupplierName());

		action.setPurchaseId(stock.getPurchaseId());

		action.setPurchaseNumber(stock.getPurchaseNumber());

		action.setPurchaseItemId(stock.getPurchaseItemId());

		action.setQuantityBefore(quantityBefore);

		action.setActionQuantity(actionQuantity);

		action.setQuantityAfter(quantityBefore);

		BigDecimal purchaseRate = money(stock.getPurchaseRate());

		action.setPurchaseRate(purchaseRate);

		action.setStockValue(money(purchaseRate.multiply(BigDecimal.valueOf(actionQuantity))));

		action.setDisposalMethod(parseOptionalDisposalMethod(request.getDisposalMethod()));

		action.setAdjustmentReason(parseOptionalAdjustmentReason(request.getAdjustmentReason()));

		action.setReferenceNumber(normalizeOptional(request.getReferenceNumber()));

		action.setAuthorizedBy(normalizeOptional(request.getAuthorizedBy()));

		action.setWitnessName(normalizeOptional(request.getWitnessName()));

		action.setDisposalLocation(normalizeOptional(request.getDisposalLocation()));

		action.setReasonDetails(normalizeOptional(request.getReasonDetails()));

		action.setRemarks(normalizeOptional(request.getRemarks()));

		action.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		return action;
	}

	private void validateActionSpecificRules(SaasExpiryActionType actionType, SaasExpiryActionRequest request,
			SaasMedicineStock stock, int currentQuantity, int quarantinedQuantity, int availableQuantity) {

		int quantity = request.getQuantity();

		switch (actionType) {

		case RETURN_TO_SUPPLIER -> {

			if (stock.getSupplierId() == null) {
				throw new RuntimeException("Supplier information is required for return-to-supplier action");
			}

			if (stock.getPurchaseId() == null) {
				throw new RuntimeException("Original purchase information is required for return-to-supplier action");
			}

			if (quantity > availableQuantity) {
				throw new RuntimeException("Return quantity cannot exceed available non-quarantined stock");
			}
		}

		case DISPOSAL -> {

			if (parseOptionalDisposalMethod(request.getDisposalMethod()) == null) {
				throw new RuntimeException("Disposal method is required");
			}

			if (quantity > availableQuantity) {
				throw new RuntimeException("Disposal quantity cannot exceed available non-quarantined stock");
			}

			if (normalizeOptional(request.getAuthorizedBy()) == null) {
				throw new RuntimeException("Authorized-by name is required for disposal");
			}
		}

		case STOCK_ADJUSTMENT -> {

			if (parseOptionalAdjustmentReason(request.getAdjustmentReason()) == null) {
				throw new RuntimeException("Stock-adjustment reason is required");
			}

			if (quantity > availableQuantity) {
				throw new RuntimeException("Adjustment quantity cannot exceed available non-quarantined stock");
			}
		}

		case QUARANTINE -> {

			if (quantity > availableQuantity) {
				throw new RuntimeException("Quarantine quantity cannot exceed available stock");
			}
		}

		case RELEASE_FROM_QUARANTINE -> {

			if (quantity > quarantinedQuantity) {
				throw new RuntimeException("Release quantity cannot exceed quarantined stock");
			}

			if (stock.getExpiryDate() != null && !stock.getExpiryDate().isAfter(LocalDate.now())) {
				throw new RuntimeException("Expired stock cannot be released from quarantine");
			}
		}
		}

		if (currentQuantity <= 0) {
			throw new RuntimeException("No stock quantity is available for expiry action");
		}
	}

	private void createInventoryMovement(SaasExpiryActionType actionType, SaasMedicineStock stock,
			SaasExpiryAction action) {

		SaasStockMovementType movementType = switch (actionType) {

		case RETURN_TO_SUPPLIER -> SaasStockMovementType.EXPIRY_RETURN_TO_SUPPLIER;

		case DISPOSAL -> SaasStockMovementType.EXPIRY_DISPOSAL;

		case STOCK_ADJUSTMENT -> SaasStockMovementType.EXPIRY_ADJUSTMENT;

		case QUARANTINE -> SaasStockMovementType.EXPIRY_QUARANTINE;

		case RELEASE_FROM_QUARANTINE -> SaasStockMovementType.EXPIRY_RELEASE;
		};

		inventoryService.createMovement(action.getTenantId(), action.getMedicineId(), stock.getId(), movementType,
				action.getActionQuantity(), buildMovementRemarks(action), action.getId());
	}

	private String buildMovementRemarks(SaasExpiryAction action) {

		StringBuilder builder = new StringBuilder();

		builder.append("Expiry action ");

		builder.append(action.getActionNumber());

		builder.append(": ");

		builder.append(action.getActionType().name());

		String reason = normalizeOptional(action.getReasonDetails());

		if (reason != null) {
			builder.append(". ");
			builder.append(reason);
		}

		return builder.toString();
	}

	private List<SaasExpiryBatchResponse> loadFilteredBatches(Long tenantId, SaasExpiryConfiguration configuration,
			SaasExpiryBatchStatus status, String keyword, Long supplierId, Integer customDays,
			Boolean includeZeroStock) {

		Stream<SaasMedicineStock> stream = stockRepository.findByTenantIdAndActiveTrueOrderByExpiryDateAsc(tenantId)
				.stream();

		if (!Boolean.TRUE.equals(includeZeroStock)) {

			stream = stream.filter(stock -> safeInteger(stock.getCurrentQuantity()) > 0);
		}

		if (supplierId != null) {

			stream = stream.filter(stock -> supplierId.equals(stock.getSupplierId()));
		}

		if (keyword != null) {

			String normalizedKeyword = keyword.toLowerCase(Locale.ROOT);

			stream = stream.filter(stock -> containsIgnoreCase(stock.getMedicineName(), normalizedKeyword)
					|| containsIgnoreCase(stock.getBatchNumber(), normalizedKeyword)
					|| containsIgnoreCase(stock.getSupplierName(), normalizedKeyword)
					|| containsIgnoreCase(stock.getPurchaseNumber(), normalizedKeyword));
		}

		List<SaasExpiryBatchResponse> result = stream.map(stock -> toBatchResponse(stock, configuration))
				.filter(item -> status == null || status.name().equals(item.getExpiryStatus()))
				.filter(item -> customDays == null || isWithinCustomDays(item, customDays))
				.sorted(Comparator.comparing(SaasExpiryBatchResponse::getExpiryDate,
						Comparator.nullsLast(Comparator.naturalOrder())))
				.toList();

		return result;
	}

	private SaasExpiryBatchResponse toBatchResponse(SaasMedicineStock stock, SaasExpiryConfiguration configuration) {

		int currentQuantity = safeInteger(stock.getCurrentQuantity());

		int quarantinedQuantity = normalizeQuarantinedQuantity(stock, currentQuantity);

		int availableQuantity = Math.max(currentQuantity - quarantinedQuantity, 0);

		Long daysToExpiry = calculateDaysToExpiry(stock.getExpiryDate());

		SaasExpiryBatchStatus status = resolveExpiryStatus(stock.getExpiryDate(), configuration);

		BigDecimal purchaseRate = money(stock.getPurchaseRate());

		int valueQuantity = SaasExpiryBatchStatus.EXPIRED.equals(status) ? currentQuantity : availableQuantity;

		BigDecimal valueAtRisk = money(purchaseRate.multiply(BigDecimal.valueOf(valueQuantity)));

		boolean actionRequired = isActionRequiredStatus(status) && currentQuantity > 0;

		return new SaasExpiryBatchResponse(stock.getId(), stock.getMedicineId(), stock.getMedicineName(),
				stock.getMedicineType(), stock.getManufacturer(), stock.getBatchNumber(), stock.getExpiryDate(),
				daysToExpiry, status.name(), currentQuantity, quarantinedQuantity, availableQuantity, purchaseRate,
				money(stock.getSaleRate()), valueAtRisk, stock.getSupplierId(), stock.getSupplierCode(),
				stock.getSupplierName(), stock.getPurchaseId(), stock.getPurchaseNumber(), stock.getPurchaseItemId(),
				stock.getSupplierId() != null && stock.getPurchaseId() != null, actionRequired);
	}

	private SaasSupplierExpiryResponse buildSupplierExpiryResponse(Long supplierId,
			List<SaasExpiryBatchResponse> items) {

		SaasExpiryBatchResponse first = items.getFirst();

		long expiredBatchCount = items.stream()
				.filter(item -> SaasExpiryBatchStatus.EXPIRED.name().equals(item.getExpiryStatus())
						|| SaasExpiryBatchStatus.EXPIRES_TODAY.name().equals(item.getExpiryStatus()))
				.count();

		long nearExpiryBatchCount = items.stream()
				.filter(item -> SaasExpiryBatchStatus.CRITICAL.name().equals(item.getExpiryStatus())
						|| SaasExpiryBatchStatus.NEAR_EXPIRY.name().equals(item.getExpiryStatus()))
				.count();

		int affectedQuantity = items.stream().mapToInt(item -> safeInteger(item.getCurrentQuantity())).sum();

		BigDecimal valueAtRisk = items.stream().map(SaasExpiryBatchResponse::getStockValueAtRisk).map(this::money)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		boolean returnAvailable = items.stream()
				.anyMatch(item -> Boolean.TRUE.equals(item.getReturnToSupplierAvailable()));

		return new SaasSupplierExpiryResponse(supplierId, first.getSupplierCode(), first.getSupplierName(),
				(long) items.size(), expiredBatchCount, nearExpiryBatchCount, affectedQuantity, money(valueAtRisk),
				returnAvailable);
	}

	private SaasExpirySummaryResponse getSummaryInternal(Long tenantId) {

		List<SaasExpiryBatchResponse> batches = getAllTrackedBatchesInternal(tenantId);

		long expired = countByStatus(batches, SaasExpiryBatchStatus.EXPIRED);

		long expiresToday = countByStatus(batches, SaasExpiryBatchStatus.EXPIRES_TODAY);

		long critical = countByStatus(batches, SaasExpiryBatchStatus.CRITICAL);

		long nearExpiry = countByStatus(batches, SaasExpiryBatchStatus.NEAR_EXPIRY);

		int expiredQuantity = batches.stream()
				.filter(item -> SaasExpiryBatchStatus.EXPIRED.name().equals(item.getExpiryStatus()))
				.mapToInt(item -> safeInteger(item.getCurrentQuantity())).sum();

		int nearExpiryQuantity = batches.stream().filter(this::isAtRiskButNotExpired)
				.mapToInt(item -> safeInteger(item.getAvailableQuantity())).sum();

		BigDecimal expiredValue = calculateValue(batches, SaasExpiryBatchStatus.EXPIRED);

		BigDecimal nearValue = batches.stream().filter(this::isAtRiskButNotExpired)
				.map(SaasExpiryBatchResponse::getStockValueAtRisk).map(this::money)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		long suppliersAffected = batches.stream().filter(this::isActionRequired)
				.map(SaasExpiryBatchResponse::getSupplierId).filter(Objects::nonNull).distinct().count();

		long pendingAction = batches.stream().filter(this::isActionRequired).count();

		return new SaasExpirySummaryResponse((long) batches.size(), expired, expiresToday, critical, nearExpiry,
				expiredQuantity, nearExpiryQuantity, money(expiredValue), money(nearValue),
				money(expiredValue.add(nearValue)), suppliersAffected, pendingAction);
	}

	private List<SaasExpiryBatchResponse> getAllTrackedBatchesInternal(Long tenantId) {

		SaasExpiryConfiguration configuration = configurationService.getOrCreateConfigurationEntity(tenantId);

		return loadFilteredBatches(tenantId, configuration, null, null, null, null,
				configuration.getIncludeZeroStockBatches());
	}

	private Integer calculateQuantityForStatus(Long tenantId, SaasExpiryBatchStatus status) {

		return getAllTrackedBatchesInternal(tenantId).stream()
				.filter(item -> status.name().equals(item.getExpiryStatus()))
				.mapToInt(item -> safeInteger(item.getCurrentQuantity())).sum();
	}

	private BigDecimal calculateValueForStatus(Long tenantId, SaasExpiryBatchStatus status) {

		return calculateValue(getAllTrackedBatchesInternal(tenantId), status);
	}

	private BigDecimal calculateValue(List<SaasExpiryBatchResponse> batches, SaasExpiryBatchStatus status) {

		return money(batches.stream().filter(item -> status.name().equals(item.getExpiryStatus()))
				.map(SaasExpiryBatchResponse::getStockValueAtRisk).map(this::money)
				.reduce(BigDecimal.ZERO, BigDecimal::add));
	}

	private long countByStatus(List<SaasExpiryBatchResponse> batches, SaasExpiryBatchStatus status) {

		return batches.stream().filter(item -> status.name().equals(item.getExpiryStatus())).count();
	}

	private SaasExpiryBatchStatus resolveExpiryStatus(LocalDate expiryDate, SaasExpiryConfiguration configuration) {

		if (expiryDate == null) {
			return SaasExpiryBatchStatus.NO_EXPIRY_DATE;
		}

		LocalDate today = LocalDate.now();

		if (expiryDate.isBefore(today)) {
			return SaasExpiryBatchStatus.EXPIRED;
		}

		if (expiryDate.isEqual(today)) {
			return SaasExpiryBatchStatus.EXPIRES_TODAY;
		}

		long days = ChronoUnit.DAYS.between(today, expiryDate);

		int criticalDays = configuration.getCriticalExpiryDays() == null ? 30 : configuration.getCriticalExpiryDays();

		int nearExpiryDays = configuration.getNearExpiryDays() == null ? 90 : configuration.getNearExpiryDays();

		if (days <= criticalDays) {
			return SaasExpiryBatchStatus.CRITICAL;
		}

		if (days <= nearExpiryDays) {
			return SaasExpiryBatchStatus.NEAR_EXPIRY;
		}

		return SaasExpiryBatchStatus.SAFE;
	}

	private SaasExpiryActionResponse createActionInternal(SaasExpiryActionRequest request) {

		Long tenantId = request.getTenantId();

		SaasExpiryActionType actionType = parseActionType(request.getActionType());

		SaasMedicineStock stock = stockRepository.findStockForUpdate(request.getStockId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Medicine stock batch not found"));

		int currentQuantity = safeInteger(stock.getCurrentQuantity());

		int quarantinedQuantity = normalizeQuarantinedQuantity(stock, currentQuantity);

		int availableQuantity = Math.max(currentQuantity - quarantinedQuantity, 0);

		int actionQuantity = request.getQuantity();

		LocalDate actionDate = request.getActionDate() == null ? LocalDate.now() : request.getActionDate();

		if (actionDate.isAfter(LocalDate.now())) {
			throw new RuntimeException("Expiry action date cannot be in the future");
		}

		validateActionSpecificRules(actionType, request, stock, currentQuantity, quarantinedQuantity,
				availableQuantity);

		SaasExpiryAction action = buildBaseAction(tenantId, stock, actionType, actionDate, actionQuantity,
				currentQuantity, request);

		applyStockAction(actionType, request, stock, action);

		stockRepository.save(stock);

		SaasExpiryAction savedAction = actionRepository.save(action);

		createInventoryMovement(actionType, stock, savedAction);

		return toActionResponse(savedAction);
	}

	private Long calculateDaysToExpiry(LocalDate expiryDate) {

		if (expiryDate == null) {
			return null;
		}

		return ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
	}

	private boolean isWithinCustomDays(SaasExpiryBatchResponse item, Integer days) {

		if (days == null) {
			return true;
		}

		if (days < 0) {
			throw new RuntimeException("Days filter cannot be negative");
		}

		return item.getDaysToExpiry() != null && item.getDaysToExpiry() >= 0 && item.getDaysToExpiry() <= days;
	}

	private boolean isActionRequiredStatus(SaasExpiryBatchStatus status) {

		return SaasExpiryBatchStatus.EXPIRED.equals(status) || SaasExpiryBatchStatus.EXPIRES_TODAY.equals(status)
				|| SaasExpiryBatchStatus.CRITICAL.equals(status) || SaasExpiryBatchStatus.NEAR_EXPIRY.equals(status);
	}

	private boolean isAtRiskButNotExpired(SaasExpiryBatchResponse item) {

		return SaasExpiryBatchStatus.EXPIRES_TODAY.name().equals(item.getExpiryStatus())
				|| SaasExpiryBatchStatus.CRITICAL.name().equals(item.getExpiryStatus())
				|| SaasExpiryBatchStatus.NEAR_EXPIRY.name().equals(item.getExpiryStatus());
	}

	private boolean isActionRequired(SaasExpiryBatchResponse item) {

		return Boolean.TRUE.equals(item.getActionRequired());
	}

	private SaasExpiryAction findAction(Long tenantId, Long actionId) {

		if (actionId == null) {
			throw new RuntimeException("Expiry action id is required");
		}

		return actionRepository.findByIdAndTenantId(actionId, tenantId)
				.orElseThrow(() -> new RuntimeException("Expiry action not found"));
	}

	private SaasExpiryActionResponse toActionResponse(SaasExpiryAction action) {

		return new SaasExpiryActionResponse(action.getId(), action.getTenantId(), action.getActionNumber(),
				action.getActionDate(), action.getActionType() == null ? null : action.getActionType().name(),
				action.getActionStatus() == null ? null : action.getActionStatus().name(), action.getStockId(),
				action.getMedicineId(), action.getMedicineName(), action.getBatchNumber(), action.getExpiryDate(),
				action.getSupplierId(), action.getSupplierCode(), action.getSupplierName(), action.getPurchaseId(),
				action.getPurchaseNumber(), action.getPurchaseItemId(), action.getQuantityBefore(),
				action.getActionQuantity(), action.getQuantityAfter(), money(action.getPurchaseRate()),
				money(action.getStockValue()),
				action.getDisposalMethod() == null ? null : action.getDisposalMethod().name(),
				action.getAdjustmentReason() == null ? null : action.getAdjustmentReason().name(),
				action.getPurchaseReturnId(), action.getPurchaseReturnNumber(), action.getReferenceNumber(),
				action.getAuthorizedBy(), action.getWitnessName(), action.getDisposalLocation(),
				action.getReasonDetails(), action.getRemarks(), action.getCreatedAt());
	}

	private void validateActionRequest(SaasExpiryActionRequest request) {

		if (request == null) {
			throw new RuntimeException("Expiry action request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getStockId() == null) {
			throw new RuntimeException("Stock batch is required");
		}

		if (request.getQuantity() == null || request.getQuantity() <= 0) {
			throw new RuntimeException("Action quantity must be greater than 0");
		}

		parseActionType(request.getActionType());
	}

	private void validateSearchRequest(SaasExpirySearchRequest request) {

		if (request == null) {
			throw new RuntimeException("Expiry search request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getDays() != null && request.getDays() < 0) {
			throw new RuntimeException("Days filter cannot be negative");
		}
	}

	private SaasExpiryActionType parseActionType(String value) {

		if (value == null || value.isBlank()) {
			throw new RuntimeException("Expiry action type is required");
		}

		try {
			return SaasExpiryActionType.valueOf(value.trim().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException exception) {
			throw new RuntimeException("Invalid expiry action type");
		}
	}

	private SaasExpiryBatchStatus parseOptionalExpiryStatus(String value) {

		String normalized = normalizeOptional(value);

		if (normalized == null) {
			return null;
		}

		try {
			return SaasExpiryBatchStatus.valueOf(normalized.toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException exception) {
			throw new RuntimeException("Invalid expiry status");
		}
	}

	private SaasExpiryDisposalMethod parseOptionalDisposalMethod(String value) {

		String normalized = normalizeOptional(value);

		if (normalized == null) {
			return null;
		}

		try {
			return SaasExpiryDisposalMethod.valueOf(normalized.toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException exception) {
			throw new RuntimeException("Invalid expiry disposal method");
		}
	}

	private SaasExpiryAdjustmentReason parseOptionalAdjustmentReason(String value) {

		String normalized = normalizeOptional(value);

		if (normalized == null) {
			return null;
		}

		try {
			return SaasExpiryAdjustmentReason.valueOf(normalized.toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException exception) {
			throw new RuntimeException("Invalid expiry adjustment reason");
		}
	}

	private String generateActionNumber(Long tenantId, SaasExpiryActionType actionType) {

		String prefix = switch (actionType) {

		case RETURN_TO_SUPPLIER -> "ERT";

		case DISPOSAL -> "EDP";

		case STOCK_ADJUSTMENT -> "EAD";

		case QUARANTINE -> "EQT";

		case RELEASE_FROM_QUARANTINE -> "ERQ";
		};

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return prefix + "-" + tenantId + "-" + timestamp + "-" + random;
	}

	private int normalizeQuarantinedQuantity(SaasMedicineStock stock, int currentQuantity) {

		int quarantined = Math.max(safeInteger(stock.getQuarantinedQuantity()), 0);

		if (quarantined > currentQuantity) {
			quarantined = currentQuantity;
		}

		return quarantined;
	}

	private boolean containsIgnoreCase(String source, String lowerCaseKeyword) {

		return source != null && source.toLowerCase(Locale.ROOT).contains(lowerCaseKeyword);
	}

	private int safeInteger(Integer value) {

		return value == null ? 0 : value;
	}

	private BigDecimal money(BigDecimal value) {

		return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
	}

	private String defaultText(String value, String fallback) {

		String normalized = normalizeOptional(value);

		return normalized == null ? fallback : normalized;
	}

	private String normalizeOptional(String value) {

		if (value == null) {
			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}

	private void validateViewAccess(Long tenantId) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.EXPIRY_MANAGEMENT, SaasPermissionAction.VIEW);
	}

	private void validateTenantAccess(Long tenantId) {

		if (tenantId == null) {
			throw new RuntimeException("tenantId is required");
		}

		tenantAccessService.validateTenantAccess(tenantId);
	}
}