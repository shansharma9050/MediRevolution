package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasSupplierRequest;
import com.example.medi.saas.dto.SaasSupplierResponse;
import com.example.medi.saas.entity.SaasSupplier;
import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasSupplierRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
public class SaasSupplierService {

    private final SaasSupplierRepository supplierRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;

    public SaasSupplierService(
            SaasSupplierRepository supplierRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {
        this.supplierRepository = supplierRepository;
        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
    }

    public List<SaasSupplierResponse> getSuppliers(
            Long tenantId,
            Boolean activeOnly
    ) {

        validateWorkspace(tenantId);

        permissionService.requirePermission(
                tenantId,
                TenantModule.SUPPLIERS,
                SaasPermissionAction.VIEW
        );

        List<SaasSupplier> suppliers;

        if (Boolean.TRUE.equals(activeOnly)) {

            suppliers =
                    supplierRepository
                            .findByTenantIdAndActiveTrueOrderBySupplierNameAsc(
                                    tenantId
                            );

        } else {

            suppliers =
                    supplierRepository
                            .findByTenantIdOrderBySupplierNameAsc(
                                    tenantId
                            );
        }

        return suppliers.stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasSupplierResponse> searchSuppliers(
            Long tenantId,
            String keyword
    ) {

        validateWorkspace(tenantId);

        permissionService.requirePermission(
                tenantId,
                TenantModule.SUPPLIERS,
                SaasPermissionAction.VIEW
        );

        if (keyword == null || keyword.isBlank()) {
            return getSuppliers(tenantId, false);
        }

        return supplierRepository
                .searchSuppliers(
                        tenantId,
                        keyword.trim()
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasSupplierResponse getSupplier(
            Long tenantId,
            Long supplierId
    ) {

        validateWorkspace(tenantId);

        permissionService.requirePermission(
                tenantId,
                TenantModule.SUPPLIERS,
                SaasPermissionAction.VIEW
        );

        return toResponse(
                findSupplier(
                        tenantId,
                        supplierId
                )
        );
    }

    @Transactional
    public SaasSupplierResponse createSupplier(
            SaasSupplierRequest request
    ) {

        Long tenantId =
                requireTenantId(request);

        validateWorkspace(tenantId);

        permissionService.requirePermission(
                tenantId,
                TenantModule.SUPPLIERS,
                SaasPermissionAction.CREATE
        );

        validateRequest(request);

        String supplierCode =
                normalizeUppercase(
                        request.getSupplierCode()
                );

        validateSupplierCodeDuplicate(
                tenantId,
                supplierCode,
                null
        );

        validateGstinDuplicate(
                tenantId,
                request.getGstin(),
                null
        );

        SaasSupplier supplier =
                new SaasSupplier();

        supplier.setTenantId(tenantId);

        applyRequest(
                supplier,
                request
        );

        supplier.setActive(true);

        supplier.setCreatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        return toResponse(
                supplierRepository.save(supplier)
        );
    }

    @Transactional
    public SaasSupplierResponse updateSupplier(
            Long tenantId,
            Long supplierId,
            SaasSupplierRequest request
    ) {

        validateWorkspace(tenantId);

        permissionService.requirePermission(
                tenantId,
                TenantModule.SUPPLIERS,
                SaasPermissionAction.UPDATE
        );

        if (request == null) {
            throw new RuntimeException(
                    "Supplier request is required"
            );
        }

        request.setTenantId(tenantId);

        validateRequest(request);

        SaasSupplier supplier =
                findSupplier(
                        tenantId,
                        supplierId
                );

        String supplierCode =
                normalizeUppercase(
                        request.getSupplierCode()
                );

        validateSupplierCodeDuplicate(
                tenantId,
                supplierCode,
                supplierId
        );

        validateGstinDuplicate(
                tenantId,
                request.getGstin(),
                supplierId
        );

        applyRequest(
                supplier,
                request
        );

        supplier.setUpdatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        return toResponse(
                supplierRepository.save(supplier)
        );
    }

    @Transactional
    public SaasSupplierResponse deactivateSupplier(
            Long tenantId,
            Long supplierId
    ) {

        validateWorkspace(tenantId);

        permissionService.requirePermission(
                tenantId,
                TenantModule.SUPPLIERS,
                SaasPermissionAction.DELETE
        );

        SaasSupplier supplier =
                findSupplier(
                        tenantId,
                        supplierId
                );

        supplier.setActive(false);

        supplier.setUpdatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        return toResponse(
                supplierRepository.save(supplier)
        );
    }

    @Transactional
    public SaasSupplierResponse activateSupplier(
            Long tenantId,
            Long supplierId
    ) {

        validateWorkspace(tenantId);

        permissionService.requirePermission(
                tenantId,
                TenantModule.SUPPLIERS,
                SaasPermissionAction.UPDATE
        );

        SaasSupplier supplier =
                findSupplier(
                        tenantId,
                        supplierId
                );

        supplier.setActive(true);

        supplier.setUpdatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        return toResponse(
                supplierRepository.save(supplier)
        );
    }

    private void applyRequest(
            SaasSupplier supplier,
            SaasSupplierRequest request
    ) {

        supplier.setSupplierCode(
                normalizeUppercase(
                        request.getSupplierCode()
                )
        );

        supplier.setSupplierName(
                normalizeRequired(
                        request.getSupplierName(),
                        "Supplier name"
                )
        );

        supplier.setContactPersonName(
                normalizeOptional(
                        request.getContactPersonName()
                )
        );

        supplier.setMobile(
                normalizeOptional(
                        request.getMobile()
                )
        );

        supplier.setEmail(
                normalizeLowercase(
                        request.getEmail()
                )
        );

        supplier.setGstin(
                normalizeUppercase(
                        request.getGstin()
                )
        );

        supplier.setDrugLicenseNumber(
                normalizeUppercase(
                        request.getDrugLicenseNumber()
                )
        );

        supplier.setAddress(
                normalizeOptional(
                        request.getAddress()
                )
        );

        supplier.setCity(
                normalizeOptional(
                        request.getCity()
                )
        );

        supplier.setDistrict(
                normalizeOptional(
                        request.getDistrict()
                )
        );

        supplier.setState(
                normalizeOptional(
                        request.getState()
                )
        );

        supplier.setPincode(
                normalizeOptional(
                        request.getPincode()
                )
        );

        supplier.setOpeningBalance(
                nonNegativeAmount(
                        request.getOpeningBalance(),
                        "Opening balance"
                )
        );

        supplier.setCreditLimit(
                nonNegativeAmount(
                        request.getCreditLimit(),
                        "Credit limit"
                )
        );

        supplier.setPaymentTermsDays(
                nonNegativeInteger(
                        request.getPaymentTermsDays(),
                        "Payment terms"
                )
        );
    }

    private void validateRequest(
            SaasSupplierRequest request
    ) {

        if (request == null) {
            throw new RuntimeException(
                    "Supplier request is required"
            );
        }

        normalizeRequired(
                request.getSupplierCode(),
                "Supplier code"
        );

        normalizeRequired(
                request.getSupplierName(),
                "Supplier name"
        );

        if (request.getMobile() != null
                && !request.getMobile().isBlank()) {

            String mobile =
                    request.getMobile()
                            .replaceAll("\\s+", "");

            if (!mobile.matches("[0-9+\\-]{8,20}")) {
                throw new RuntimeException(
                        "Please enter a valid mobile number"
                );
            }
        }

        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && !request.getEmail()
                        .trim()
                        .matches(
                                "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"
                        )) {

            throw new RuntimeException(
                    "Please enter a valid email address"
            );
        }

        if (request.getPincode() != null
                && !request.getPincode().isBlank()
                && !request.getPincode()
                        .trim()
                        .matches("[0-9]{4,12}")) {

            throw new RuntimeException(
                    "Please enter a valid pincode"
            );
        }

        nonNegativeAmount(
                request.getOpeningBalance(),
                "Opening balance"
        );

        nonNegativeAmount(
                request.getCreditLimit(),
                "Credit limit"
        );

        nonNegativeInteger(
                request.getPaymentTermsDays(),
                "Payment terms"
        );
    }

    private void validateSupplierCodeDuplicate(
            Long tenantId,
            String supplierCode,
            Long currentSupplierId
    ) {

        if (currentSupplierId == null) {

            supplierRepository
                    .findByTenantIdAndSupplierCodeIgnoreCase(
                            tenantId,
                            supplierCode
                    )
                    .ifPresent(
                            duplicate -> {
                                throw new RuntimeException(
                                        "Supplier code already exists in this workspace"
                                );
                            }
                    );

            return;
        }

        supplierRepository
                .findByTenantIdAndSupplierCodeIgnoreCaseAndIdNot(
                        tenantId,
                        supplierCode,
                        currentSupplierId
                )
                .ifPresent(
                        duplicate -> {
                            throw new RuntimeException(
                                    "Supplier code already exists in this workspace"
                            );
                        }
                );
    }

    private void validateGstinDuplicate(
            Long tenantId,
            String gstin,
            Long currentSupplierId
    ) {

        String normalizedGstin =
                normalizeUppercase(gstin);

        if (normalizedGstin == null) {
            return;
        }

        if (currentSupplierId == null) {

            supplierRepository
                    .findByTenantIdAndGstinIgnoreCase(
                            tenantId,
                            normalizedGstin
                    )
                    .ifPresent(
                            duplicate -> {
                                throw new RuntimeException(
                                        "GSTIN already belongs to another supplier"
                                );
                            }
                    );

            return;
        }

        supplierRepository
                .findByTenantIdAndGstinIgnoreCaseAndIdNot(
                        tenantId,
                        normalizedGstin,
                        currentSupplierId
                )
                .ifPresent(
                        duplicate -> {
                            throw new RuntimeException(
                                    "GSTIN already belongs to another supplier"
                            );
                        }
                );
    }

    private SaasSupplier findSupplier(
            Long tenantId,
            Long supplierId
    ) {

        if (supplierId == null) {
            throw new RuntimeException(
                    "Supplier id is required"
            );
        }

        return supplierRepository
                .findByIdAndTenantId(
                        supplierId,
                        tenantId
                )
                .orElseThrow(
                        () -> new RuntimeException(
                                "Supplier not found"
                        )
                );
    }

    private Tenant validateWorkspace(
            Long tenantId
    ) {

        Tenant tenant =
                tenantAccessService
                        .validateTenantAccess(
                                tenantId
                        );

        String tenantType =
                tenant.getTenantType() == null
                        ? ""
                        : tenant.getTenantType()
                                .name()
                                .trim()
                                .toUpperCase(Locale.ROOT);

        if (!"WHOLESALER".equals(tenantType)
                && !"RETAILER".equals(tenantType)) {

            throw new RuntimeException(
                    "Suppliers module is available only for Wholesaler and Retailer workspaces"
            );
        }

        return tenant;
    }

    private Long requireTenantId(
            SaasSupplierRequest request
    ) {

        if (request == null
                || request.getTenantId() == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }

        return request.getTenantId();
    }

    private String normalizeRequired(
            String value,
            String fieldName
    ) {

        String normalized =
                normalizeOptional(value);

        if (normalized == null) {
            throw new RuntimeException(
                    fieldName + " is required"
            );
        }

        return normalized;
    }

    private String normalizeOptional(
            String value
    ) {

        if (value == null) {
            return null;
        }

        String normalized =
                value.trim()
                        .replaceAll("\\s+", " ");

        return normalized.isBlank()
                ? null
                : normalized;
    }

    private String normalizeUppercase(
            String value
    ) {

        String normalized =
                normalizeOptional(value);

        return normalized == null
                ? null
                : normalized.toUpperCase(
                        Locale.ROOT
                );
    }

    private String normalizeLowercase(
            String value
    ) {

        String normalized =
                normalizeOptional(value);

        return normalized == null
                ? null
                : normalized.toLowerCase(
                        Locale.ROOT
                );
    }

    private BigDecimal nonNegativeAmount(
            BigDecimal value,
            String fieldName
    ) {

        BigDecimal amount =
                value == null
                        ? BigDecimal.ZERO
                        : value;

        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    fieldName + " cannot be negative"
            );
        }

        return amount;
    }

    private Integer nonNegativeInteger(
            Integer value,
            String fieldName
    ) {

        int number =
                value == null
                        ? 0
                        : value;

        if (number < 0) {
            throw new RuntimeException(
                    fieldName + " cannot be negative"
            );
        }

        return number;
    }

    private SaasSupplierResponse toResponse(
            SaasSupplier supplier
    ) {

        return new SaasSupplierResponse(
                supplier.getId(),
                supplier.getTenantId(),
                supplier.getSupplierCode(),
                supplier.getSupplierName(),
                supplier.getContactPersonName(),
                supplier.getMobile(),
                supplier.getEmail(),
                supplier.getGstin(),
                supplier.getDrugLicenseNumber(),
                supplier.getAddress(),
                supplier.getCity(),
                supplier.getDistrict(),
                supplier.getState(),
                supplier.getPincode(),
                supplier.getOpeningBalance(),
                supplier.getCreditLimit(),
                supplier.getPaymentTermsDays(),
                supplier.getActive(),
                supplier.getCreatedAt(),
                supplier.getUpdatedAt()
        );
    }
}