package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.SaasMedicine;
import com.example.medi.saas.entity.SaasMedicineStock;
import com.example.medi.saas.entity.SaasStockMovement;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStockMovementType;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasMedicineRepository;
import com.example.medi.saas.repository.SaasMedicineStockRepository;
import com.example.medi.saas.repository.SaasStockMovementRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
public class SaasInventoryService {

	private final SaasMedicineRepository medicineRepository;
	private final SaasMedicineStockRepository stockRepository;
	private final SaasStockMovementRepository movementRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasNotificationService notificationService;
	private final SaasPermissionService permissionService;

	public SaasInventoryService(SaasMedicineRepository medicineRepository, SaasMedicineStockRepository stockRepository,
			SaasStockMovementRepository movementRepository, TenantAccessService tenantAccessService,
			SaasNotificationService notificationService, SaasPermissionService permissionService) {
		this.medicineRepository = medicineRepository;
		this.stockRepository = stockRepository;
		this.movementRepository = movementRepository;
		this.tenantAccessService = tenantAccessService;
		this.notificationService = notificationService;
		this.permissionService = permissionService;
	}

	public SaasMedicineResponse createMedicine(SaasMedicineRequest request) {

		validateMedicineRequest(request);

		tenantAccessService.validateTenantAccess(request.getTenantId());

		permissionService.requirePermission(request.getTenantId(), TenantModule.INVENTORY, SaasPermissionAction.CREATE);

		SaasMedicine medicine = new SaasMedicine();

		medicine.setTenantId(request.getTenantId());

		medicine.setMedicineName(request.getMedicineName().trim());

		medicine.setMedicineType(normalizeOptional(request.getMedicineType()));

		medicine.setManufacturer(normalizeOptional(request.getManufacturer()));

		medicine.setSaltName(normalizeOptional(request.getSaltName()));

		medicine.setStrength(normalizeOptional(request.getStrength()));

		medicine.setUnit(normalizeOptional(request.getUnit()));

		medicine.setReorderLevel(request.getReorderLevel() == null ? 10 : Math.max(request.getReorderLevel(), 0));

		medicine.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		medicine.setActive(true);

		return toMedicineResponse(medicineRepository.save(medicine));
	}

	public List<SaasMedicineResponse> getMedicines(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		return medicineRepository.findByTenantIdAndActiveTrueOrderByMedicineNameAsc(tenantId).stream()
				.map(this::toMedicineResponse).toList();
	}

	public List<SaasMedicineResponse> searchMedicines(Long tenantId, String keyword) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {
			return getMedicines(tenantId);
		}

		return medicineRepository
				.findByTenantIdAndActiveTrueAndMedicineNameContainingIgnoreCaseOrderByMedicineNameAsc(tenantId,
						keyword.trim())
				.stream().map(this::toMedicineResponse).toList();
	}

	@Transactional
	public SaasMedicineStockResponse addStock(SaasMedicineStockRequest request) {

		validateStockRequest(request);

		tenantAccessService.validateTenantAccess(request.getTenantId());

		permissionService.requirePermission(request.getTenantId(), TenantModule.INVENTORY, SaasPermissionAction.CREATE);

		SaasMedicine medicine = findActiveMedicine(request.getTenantId(), request.getMedicineId());

		int quantity = request.getQuantity();

		SaasMedicineStock stock = new SaasMedicineStock();

		stock.setTenantId(request.getTenantId());

		stock.setMedicineId(medicine.getId());

		stock.setBatchNumber(normalizeRequired(request.getBatchNumber(), "Batch number"));

		stock.setManufacturingDate(request.getManufacturingDate());

		stock.setExpiryDate(request.getExpiryDate());

		stock.setOpeningQuantity(quantity);
		stock.setCurrentQuantity(quantity);

		stock.setPurchasePrice(nonNegativeAmount(request.getPurchasePrice(), "Purchase price"));

		stock.setSalePrice(nonNegativeAmount(request.getSalePrice(), "Sale price"));

		stock.setMrp(nonNegativeAmount(request.getMrp(), "MRP"));

		stock.setGstPercentage(validPercentage(request.getGstPercentage(), "GST percentage"));

		stock.setSupplierId(request.getSupplierId());

		stock.setSupplierName(normalizeOptional(request.getSupplierName()));

		stock.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		stock.setActive(true);

		SaasMedicineStock saved = stockRepository.save(stock);

		createMovement(saved.getTenantId(), medicine.getId(), saved.getId(), SaasStockMovementType.PURCHASE, quantity,
				"Manual stock added", null);

		return createStockResponseAndNotification(saved);
	}

	/*
	 * Purchase module is method ko internally call karega.
	 *
	 * Same tenant + medicine + batch milne par stock merge hoga. Batch nahi milne
	 * par new stock row create hogi.
	 */
	@Transactional
	public SaasMedicineStock addOrMergePurchaseStock(Long tenantId, Long medicineId, String batchNumber,
			LocalDate manufacturingDate, LocalDate expiryDate, Integer receivedQuantity, BigDecimal purchasePrice,
			BigDecimal salePrice, BigDecimal mrp, BigDecimal gstPercentage, Long supplierId, String supplierName,
			Long purchaseId) {

		tenantAccessService.validateTenantAccess(tenantId);

		SaasMedicine medicine = findActiveMedicine(tenantId, medicineId);

		String normalizedBatch = normalizeRequired(batchNumber, "Batch number");

		int quantity = receivedQuantity == null ? 0 : receivedQuantity;

		if (quantity <= 0) {
			throw new RuntimeException("Received stock quantity must be greater than 0");
		}

		if (expiryDate != null && manufacturingDate != null && expiryDate.isBefore(manufacturingDate)) {

			throw new RuntimeException("Expiry date cannot be before manufacturing date");
		}

		SaasMedicineStock stock = stockRepository
				.findByTenantIdAndMedicineIdAndBatchNumberIgnoreCaseAndActiveTrue(tenantId, medicineId, normalizedBatch)
				.orElse(null);

		if (stock == null) {

			stock = new SaasMedicineStock();

			stock.setTenantId(tenantId);
			stock.setMedicineId(medicineId);
			stock.setBatchNumber(normalizedBatch);
			stock.setOpeningQuantity(quantity);
			stock.setCurrentQuantity(quantity);
			stock.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
			stock.setActive(true);

		} else {

			int oldOpeningQuantity = stock.getOpeningQuantity() == null ? 0 : stock.getOpeningQuantity();

			int oldCurrentQuantity = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();

			stock.setOpeningQuantity(oldOpeningQuantity + quantity);

			stock.setCurrentQuantity(oldCurrentQuantity + quantity);

			stock.touch();
		}

		stock.setManufacturingDate(manufacturingDate);

		stock.setExpiryDate(expiryDate);

		stock.setPurchasePrice(nonNegativeAmount(purchasePrice, "Purchase price"));

		stock.setSalePrice(nonNegativeAmount(salePrice, "Sale price"));

		stock.setMrp(nonNegativeAmount(mrp, "MRP"));

		stock.setGstPercentage(validPercentage(gstPercentage, "GST percentage"));

		stock.setSupplierId(supplierId);

		stock.setSupplierName(normalizeOptional(supplierName));

		stock.setLastPurchaseId(purchaseId);

		SaasMedicineStock saved = stockRepository.save(stock);

		createMovement(tenantId, medicine.getId(), saved.getId(), SaasStockMovementType.PURCHASE, quantity,
				"Stock received through purchase", purchaseId);

		return saved;
	}

	public List<SaasMedicineStockResponse> getStocks(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		return stockRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream()
				.map(this::toStockResponse).toList();
	}

	public List<SaasMedicineStockResponse> getStockByMedicine(Long tenantId, Long medicineId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		return stockRepository.findByTenantIdAndMedicineIdAndActiveTrueOrderByExpiryDateAsc(tenantId, medicineId)
				.stream().map(this::toStockResponse).toList();
	}

	public List<SaasMedicineStockResponse> getLowStock(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		return stockRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream()
				.map(this::toStockResponse).filter(SaasMedicineStockResponse::getLowStock).toList();
	}

	@Transactional
	public SaasMedicineStockResponse adjustStock(SaasStockAdjustmentRequest request) {

		if (request == null) {
			throw new RuntimeException("Stock adjustment request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		tenantAccessService.validateTenantAccess(request.getTenantId());

		permissionService.requirePermission(request.getTenantId(), TenantModule.INVENTORY, SaasPermissionAction.UPDATE);

		if (request.getStockId() == null) {
			throw new RuntimeException("stockId is required");
		}

		if (request.getMovementType() == null || request.getMovementType().isBlank()) {

			throw new RuntimeException("movementType is required");
		}

		if (request.getQuantity() == null || request.getQuantity() <= 0) {

			throw new RuntimeException("quantity must be greater than 0");
		}

		SaasMedicineStock stock = stockRepository
				.findByIdAndTenantIdAndActiveTrue(request.getStockId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Stock not found"));

		SaasStockMovementType type;

		try {

			type = SaasStockMovementType.valueOf(request.getMovementType().trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid stock movement type");
		}

		int currentQuantity = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();

		int quantity = request.getQuantity();

		if (type == SaasStockMovementType.ADJUSTMENT_IN || type == SaasStockMovementType.RETURN
				|| type == SaasStockMovementType.PURCHASE) {

			stock.setCurrentQuantity(currentQuantity + quantity);

		} else {

			if (currentQuantity < quantity) {
				throw new RuntimeException("Insufficient stock");
			}

			stock.setCurrentQuantity(currentQuantity - quantity);
		}

		stock.touch();

		SaasMedicineStock saved = stockRepository.save(stock);

		createMovement(saved.getTenantId(), saved.getMedicineId(), saved.getId(), type, quantity,
				normalizeOptional(request.getRemarks()), null);

		return createStockResponseAndNotification(saved);
	}

	public void createMovement(Long tenantId, Long medicineId, Long stockId, SaasStockMovementType type,
			Integer quantity, String remarks, Long referenceId) {

		SaasStockMovement movement = new SaasStockMovement();

		movement.setTenantId(tenantId);
		movement.setMedicineId(medicineId);
		movement.setStockId(stockId);
		movement.setMovementType(type);
		movement.setQuantity(quantity);
		movement.setRemarks(remarks);
		movement.setReferenceId(referenceId);

		movement.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		movementRepository.save(movement);
	}

	private SaasMedicineStockResponse createStockResponseAndNotification(SaasMedicineStock stock) {

		SaasMedicineStockResponse response = toStockResponse(stock);

		if (Boolean.TRUE.equals(response.getLowStock())) {

			notificationService.createSystemNotificationIfNotExists(stock.getTenantId(), SaasNotificationType.LOW_STOCK,
					SaasNotificationPriority.HIGH, "Low stock alert",
					response.getMedicineName() + " batch " + response.getBatchNumber()
							+ " has low stock. Current quantity: " + response.getCurrentQuantity(),
					stock.getId(), "STOCK", "/saas/inventory");
		}

		return response;
	}

	private void validateMedicineRequest(SaasMedicineRequest request) {

		if (request == null) {
			throw new RuntimeException("Medicine request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		normalizeRequired(request.getMedicineName(), "Medicine name");
	}

	private void validateStockRequest(SaasMedicineStockRequest request) {

		if (request == null) {
			throw new RuntimeException("Stock request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getMedicineId() == null) {
			throw new RuntimeException("medicineId is required");
		}

		normalizeRequired(request.getBatchNumber(), "Batch number");

		if (request.getQuantity() == null || request.getQuantity() <= 0) {

			throw new RuntimeException("quantity must be greater than 0");
		}

		if (request.getExpiryDate() != null && request.getManufacturingDate() != null
				&& request.getExpiryDate().isBefore(request.getManufacturingDate())) {

			throw new RuntimeException("Expiry date cannot be before manufacturing date");
		}
	}

	private SaasMedicine findActiveMedicine(Long tenantId, Long medicineId) {

		return medicineRepository.findByIdAndTenantIdAndActiveTrue(medicineId, tenantId)
				.orElseThrow(() -> new RuntimeException("Medicine not found in this workspace"));
	}

	private SaasMedicineResponse toMedicineResponse(SaasMedicine medicine) {

		return new SaasMedicineResponse(medicine.getId(), medicine.getTenantId(), medicine.getMedicineName(),
				medicine.getMedicineType(), medicine.getManufacturer(), medicine.getSaltName(), medicine.getStrength(),
				medicine.getUnit(), medicine.getReorderLevel(), medicine.getActive());
	}

	public List<SaasMedicineStockResponse> searchStocks(Long tenantId, String keyword) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {
			return getStocks(tenantId);
		}

		return stockRepository.searchStocks(tenantId, keyword.trim()).stream().map(this::toStockResponse).toList();
	}

	public List<SaasMedicineStockResponse> getExpiredStock(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		return stockRepository
				.findByTenantIdAndActiveTrueAndExpiryDateBeforeOrderByExpiryDateAsc(tenantId, LocalDate.now()).stream()
				.map(this::toStockResponse).toList();
	}

	public List<SaasMedicineStockResponse> getNearExpiryStock(Long tenantId, Integer days) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		int safeDays = days == null ? 90 : days;

		if (safeDays < 1 || safeDays > 730) {
			throw new RuntimeException("Near-expiry days must be between 1 and 730");
		}

		LocalDate today = LocalDate.now();

		LocalDate endDate = today.plusDays(safeDays);

		return stockRepository
				.findByTenantIdAndActiveTrueAndExpiryDateBetweenOrderByExpiryDateAsc(tenantId, today, endDate).stream()
				.map(this::toStockResponse).toList();
	}

	public SaasInventorySummaryResponse getInventorySummary(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		List<SaasMedicineStockResponse> stocks = stockRepository
				.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream().map(this::toStockResponse).toList();

		long lowStockCount = stocks.stream().filter(stock -> Boolean.TRUE.equals(stock.getLowStock())).count();

		long expiredCount = stocks.stream().filter(stock -> Boolean.TRUE.equals(stock.getExpired())).count();

		LocalDate today = LocalDate.now();

		LocalDate nearExpiryDate = today.plusDays(90);

		long nearExpiryCount = stocks.stream()
				.filter(stock -> !Boolean.TRUE.equals(stock.getExpired()) && stock.getExpiryDate() != null
						&& !stock.getExpiryDate().isBefore(today) && !stock.getExpiryDate().isAfter(nearExpiryDate))
				.count();

		return new SaasInventorySummaryResponse(medicineRepository.countByTenantIdAndActiveTrue(tenantId),

				stockRepository.countByTenantIdAndActiveTrue(tenantId),

				safeLong(stockRepository.sumCurrentQuantity(tenantId)),

				lowStockCount,

				expiredCount,

				nearExpiryCount,

				safeAmount(stockRepository.sumPurchaseValue(tenantId)),

				safeAmount(stockRepository.sumSaleValue(tenantId)));
	}

	public List<SaasStockMovementResponse> getMovements(Long tenantId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		return movementRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream().map(this::toMovementResponse)
				.toList();
	}

	public List<SaasStockMovementResponse> getStockMovements(Long tenantId, Long stockId) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.INVENTORY, SaasPermissionAction.VIEW);

		if (stockId == null) {
			throw new RuntimeException("stockId is required");
		}

		stockRepository.findByIdAndTenantIdAndActiveTrue(stockId, tenantId)
				.orElseThrow(() -> new RuntimeException("Stock not found"));

		return movementRepository.findByTenantIdAndStockIdOrderByCreatedAtDesc(tenantId, stockId).stream()
				.map(this::toMovementResponse).toList();
	}

	private SaasStockMovementResponse toMovementResponse(SaasStockMovement movement) {

		SaasMedicine medicine = medicineRepository.findByIdAndTenantId(movement.getMedicineId(), movement.getTenantId())
				.orElse(null);

		SaasMedicineStock stock = movement.getStockId() == null ? null
				: stockRepository.findById(movement.getStockId())
						.filter(item -> item.getTenantId().equals(movement.getTenantId())).orElse(null);

		return new SaasStockMovementResponse(movement.getId(), movement.getTenantId(), movement.getMedicineId(),
				medicine == null ? null : medicine.getMedicineName(), movement.getStockId(),
				stock == null ? null : stock.getBatchNumber(),
				movement.getMovementType() == null ? null : movement.getMovementType().name(), movement.getQuantity(),
				movement.getRemarks(), movement.getReferenceId(), movement.getCreatedByAuthUserId(),
				movement.getCreatedAt());
	}

	private Long safeLong(Long value) {
		return value == null ? 0L : value;
	}

	private BigDecimal safeAmount(BigDecimal value) {
		return value == null ? BigDecimal.ZERO : value.setScale(2, java.math.RoundingMode.HALF_UP);
	}

	private SaasMedicineStockResponse toStockResponse(SaasMedicineStock stock) {

		SaasMedicine medicine = medicineRepository
				.findByIdAndTenantIdAndActiveTrue(stock.getMedicineId(), stock.getTenantId()).orElse(null);

		int currentQuantity = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();

		int reorderLevel = medicine == null || medicine.getReorderLevel() == null ? 10 : medicine.getReorderLevel();

		boolean lowStock = currentQuantity <= reorderLevel;

		boolean expired = stock.getExpiryDate() != null && stock.getExpiryDate().isBefore(LocalDate.now());

		return new SaasMedicineStockResponse(stock.getId(), stock.getTenantId(), stock.getMedicineId(),
				medicine == null ? null : medicine.getMedicineName(),
				medicine == null ? null : medicine.getMedicineType(),
				medicine == null ? null : medicine.getManufacturer(), stock.getBatchNumber(),
				stock.getManufacturingDate(), stock.getExpiryDate(), stock.getOpeningQuantity(),
				stock.getCurrentQuantity(), stock.getPurchasePrice(), stock.getSalePrice(), stock.getMrp(),
				stock.getGstPercentage(), stock.getSupplierId(), stock.getSupplierName(), stock.getLastPurchaseId(),
				reorderLevel, lowStock, expired, stock.getActive());
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

	private BigDecimal nonNegativeAmount(BigDecimal value, String fieldName) {

		BigDecimal amount = value == null ? BigDecimal.ZERO : value;

		if (amount.compareTo(BigDecimal.ZERO) < 0) {
			throw new RuntimeException(fieldName + " cannot be negative");
		}

		return amount;
	}

	private BigDecimal validPercentage(BigDecimal value, String fieldName) {

		BigDecimal percentage = value == null ? BigDecimal.ZERO : value;

		if (percentage.compareTo(BigDecimal.ZERO) < 0 || percentage.compareTo(new BigDecimal("100")) > 0) {

			throw new RuntimeException(fieldName + " must be between 0 and 100");
		}

		return percentage;
	}
}