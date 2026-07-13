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

import java.time.LocalDate;
import java.util.List;

@Service
public class SaasInventoryService {

    private final SaasMedicineRepository medicineRepository;
    private final SaasMedicineStockRepository stockRepository;
    private final SaasStockMovementRepository movementRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasNotificationService notificationService;
    private final SaasPermissionService permissionService;

    public SaasInventoryService(
            SaasMedicineRepository medicineRepository,
            SaasMedicineStockRepository stockRepository,
            SaasStockMovementRepository movementRepository,
            TenantAccessService tenantAccessService,
            SaasNotificationService notificationService,
            SaasPermissionService permissionService
    ) {
        this.medicineRepository = medicineRepository;
        this.stockRepository = stockRepository;
        this.movementRepository = movementRepository;
        this.tenantAccessService = tenantAccessService;
        this.notificationService = notificationService;
        this.permissionService = permissionService;
    }

    public SaasMedicineResponse createMedicine(SaasMedicineRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.CREATE
    	);

        validateMedicineRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasMedicine medicine = new SaasMedicine();
        medicine.setTenantId(request.getTenantId());
        medicine.setMedicineName(request.getMedicineName().trim());
        medicine.setMedicineType(request.getMedicineType());
        medicine.setManufacturer(request.getManufacturer());
        medicine.setSaltName(request.getSaltName());
        medicine.setStrength(request.getStrength());
        medicine.setUnit(request.getUnit());
        medicine.setReorderLevel(request.getReorderLevel() == null ? 10 : request.getReorderLevel());
        medicine.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        medicine.setActive(true);

        return toMedicineResponse(medicineRepository.save(medicine));
    }

    public List<SaasMedicineResponse> getMedicines(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return medicineRepository
                .findByTenantIdAndActiveTrueOrderByMedicineNameAsc(tenantId)
                .stream()
                .map(this::toMedicineResponse)
                .toList();
    }

    public List<SaasMedicineResponse> searchMedicines(Long tenantId, String keyword) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        if (keyword == null || keyword.isBlank()) {
            return getMedicines(tenantId);
        }

        return medicineRepository
                .findByTenantIdAndActiveTrueAndMedicineNameContainingIgnoreCaseOrderByMedicineNameAsc(
                        tenantId,
                        keyword.trim()
                )
                .stream()
                .map(this::toMedicineResponse)
                .toList();
    }

    @Transactional
    public SaasMedicineStockResponse addStock(SaasMedicineStockRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.CREATE
    	);

        validateStockRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasMedicine medicine = medicineRepository
                .findByIdAndTenantIdAndActiveTrue(request.getMedicineId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        int qty = request.getQuantity() == null ? 0 : request.getQuantity();

        if (qty <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }

        SaasMedicineStock stock = new SaasMedicineStock();
        stock.setTenantId(request.getTenantId());
        stock.setMedicineId(medicine.getId());
        stock.setBatchNumber(request.getBatchNumber());
        stock.setExpiryDate(request.getExpiryDate());
        stock.setOpeningQuantity(qty);
        stock.setCurrentQuantity(qty);
        stock.setPurchasePrice(request.getPurchasePrice() == null ? java.math.BigDecimal.ZERO : request.getPurchasePrice());
        stock.setSalePrice(request.getSalePrice() == null ? java.math.BigDecimal.ZERO : request.getSalePrice());
        stock.setSupplierName(request.getSupplierName());
        stock.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        stock.setActive(true);

        SaasMedicineStock saved = stockRepository.save(stock);

        createMovement(
                saved.getTenantId(),
                medicine.getId(),
                saved.getId(),
                SaasStockMovementType.PURCHASE,
                qty,
                "Stock added",
                null
        );

        SaasMedicineStockResponse response = toStockResponse(saved);

        if (response.getLowStock()) {
        	notificationService.createSystemNotificationIfNotExists(
                    saved.getTenantId(),
                    SaasNotificationType.LOW_STOCK,
                    SaasNotificationPriority.HIGH,
                    "Low stock alert",
                    response.getMedicineName() + " batch " + response.getBatchNumber()
                            + " has low stock. Current quantity: " + response.getCurrentQuantity(),
                    saved.getId(),
                    "STOCK",
                    "/saas/inventory"
            );
        }

        return response;
    }

    public List<SaasMedicineStockResponse> getStocks(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return stockRepository
                .findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toStockResponse)
                .toList();
    }

    public List<SaasMedicineStockResponse> getStockByMedicine(Long tenantId, Long medicineId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return stockRepository
                .findByTenantIdAndMedicineIdAndActiveTrueOrderByExpiryDateAsc(tenantId, medicineId)
                .stream()
                .map(this::toStockResponse)
                .toList();
    }

    public List<SaasMedicineStockResponse> getLowStock(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return stockRepository
                .findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toStockResponse)
                .filter(SaasMedicineStockResponse::getLowStock)
                .toList();
    }

    @Transactional
    public SaasMedicineStockResponse adjustStock(SaasStockAdjustmentRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.INVENTORY,
    	        SaasPermissionAction.UPDATE
    	);

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getStockId() == null) {
            throw new RuntimeException("stockId is required");
        }

        if (request.getMovementType() == null || request.getMovementType().isBlank()) {
            throw new RuntimeException("movementType is required");
        }

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new RuntimeException("quantity must be greater than 0");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasMedicineStock stock = stockRepository
                .findByIdAndTenantIdAndActiveTrue(request.getStockId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Stock not found"));

        SaasStockMovementType type =
                SaasStockMovementType.valueOf(request.getMovementType().toUpperCase());

        int currentQty = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();
        int qty = request.getQuantity();

        if (type == SaasStockMovementType.ADJUSTMENT_IN
                || type == SaasStockMovementType.RETURN) {
            stock.setCurrentQuantity(currentQty + qty);
        } else {
            if (currentQty < qty) {
                throw new RuntimeException("Insufficient stock");
            }

            stock.setCurrentQuantity(currentQty - qty);
        }

        stock.touch();

        SaasMedicineStock saved = stockRepository.save(stock);

        createMovement(
                saved.getTenantId(),
                saved.getMedicineId(),
                saved.getId(),
                type,
                qty,
                request.getRemarks(),
                null
        );

        SaasMedicineStockResponse response = toStockResponse(saved);

        if (response.getLowStock()) {
        	notificationService.createSystemNotificationIfNotExists(
                    saved.getTenantId(),
                    SaasNotificationType.LOW_STOCK,
                    SaasNotificationPriority.HIGH,
                    "Low stock alert",
                    response.getMedicineName() + " batch " + response.getBatchNumber()
                            + " has low stock. Current quantity: " + response.getCurrentQuantity(),
                    saved.getId(),
                    "STOCK",
                    "/saas/inventory"
            );
        }

        return response;
    }

    public void createMovement(
            Long tenantId,
            Long medicineId,
            Long stockId,
            SaasStockMovementType type,
            Integer quantity,
            String remarks,
            Long referenceId
    ) {
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

    private void validateMedicineRequest(SaasMedicineRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getMedicineName() == null || request.getMedicineName().isBlank()) {
            throw new RuntimeException("Medicine name is required");
        }
    }

    private void validateStockRequest(SaasMedicineStockRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getMedicineId() == null) {
            throw new RuntimeException("medicineId is required");
        }

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new RuntimeException("quantity must be greater than 0");
        }
    }

    private SaasMedicineResponse toMedicineResponse(SaasMedicine medicine) {
        return new SaasMedicineResponse(
                medicine.getId(),
                medicine.getTenantId(),
                medicine.getMedicineName(),
                medicine.getMedicineType(),
                medicine.getManufacturer(),
                medicine.getSaltName(),
                medicine.getStrength(),
                medicine.getUnit(),
                medicine.getReorderLevel(),
                medicine.getActive()
        );
    }

    private SaasMedicineStockResponse toStockResponse(SaasMedicineStock stock) {

        SaasMedicine medicine = medicineRepository
                .findByIdAndTenantIdAndActiveTrue(stock.getMedicineId(), stock.getTenantId())
                .orElse(null);

        int currentQty = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();
        int reorderLevel = medicine == null || medicine.getReorderLevel() == null
                ? 10
                : medicine.getReorderLevel();

        boolean lowStock = currentQty <= reorderLevel;

        boolean expired = stock.getExpiryDate() != null
                && stock.getExpiryDate().isBefore(LocalDate.now());

        return new SaasMedicineStockResponse(
                stock.getId(),
                stock.getTenantId(),
                stock.getMedicineId(),
                medicine == null ? null : medicine.getMedicineName(),
                medicine == null ? null : medicine.getMedicineType(),
                medicine == null ? null : medicine.getManufacturer(),
                stock.getBatchNumber(),
                stock.getExpiryDate(),
                stock.getOpeningQuantity(),
                stock.getCurrentQuantity(),
                stock.getPurchasePrice(),
                stock.getSalePrice(),
                stock.getSupplierName(),
                reorderLevel,
                lowStock,
                expired,
                stock.getActive()
        );
    }
}