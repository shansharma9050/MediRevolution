package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatientAllergyRequest;
import com.example.medi.saas.dto.SaasPatientAllergyResponse;
import com.example.medi.saas.entity.SaasPatientAllergy;
import com.example.medi.saas.enums.SaasAllergySeverity;
import com.example.medi.saas.enums.SaasAllergyStatus;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasPatientAllergyRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SaasPatientAllergyService {

    private final SaasPatientAllergyRepository allergyRepository;

    private final SaasPatientRepository patientRepository;

    private final TenantAccessService tenantAccessService;

    private final SaasPermissionService permissionService;


    public SaasPatientAllergyService(
            SaasPatientAllergyRepository allergyRepository,
            SaasPatientRepository patientRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {

        this.allergyRepository =
                allergyRepository;

        this.patientRepository =
                patientRepository;

        this.tenantAccessService =
                tenantAccessService;

        this.permissionService =
                permissionService;
    }


    /*
     * ================================================================
     * CREATE
     * ================================================================
     */

    @Transactional
    public SaasPatientAllergyResponse createAllergy(
            SaasPatientAllergyRequest request
    ) {

        validateCreateRequest(
                request
        );


        Long tenantId =
                request.getTenantId();


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.CREATE
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        validatePatient(
                tenantId,
                request.getPatientId()
        );


        SaasPatientAllergy allergy =
                new SaasPatientAllergy();


        allergy.setTenantId(
                tenantId
        );

        allergy.setPatientId(
                request.getPatientId()
        );

        applyRequest(
                allergy,
                request
        );

        allergy.setActive(
                true
        );

        allergy.setCreatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );


        SaasPatientAllergy saved =
                allergyRepository.save(
                        allergy
                );


        return toResponse(
                saved
        );
    }


    /*
     * ================================================================
     * LIST
     * ================================================================
     */

    @Transactional(readOnly = true)
    public List<SaasPatientAllergyResponse> getPatientAllergies(
            Long tenantId,
            Long patientId
    ) {

        validateIds(
                tenantId,
                patientId
        );


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.VIEW
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        validatePatient(
                tenantId,
                patientId
        );


        return allergyRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                        tenantId,
                        patientId
                )
                .stream()
                .map(
                        this::toResponse
                )
                .toList();
    }


    /*
     * ================================================================
     * GET ONE
     * ================================================================
     */

    @Transactional(readOnly = true)
    public SaasPatientAllergyResponse getAllergy(
            Long tenantId,
            Long allergyId
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (allergyId == null) {

            throw new RuntimeException(
                    "allergyId is required"
            );
        }


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.VIEW
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        return toResponse(
                findActiveAllergy(
                        tenantId,
                        allergyId
                )
        );
    }


    /*
     * ================================================================
     * UPDATE
     * ================================================================
     */

    @Transactional
    public SaasPatientAllergyResponse updateAllergy(
            Long tenantId,
            Long allergyId,
            SaasPatientAllergyRequest request
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (allergyId == null) {

            throw new RuntimeException(
                    "allergyId is required"
            );
        }


        if (request == null) {

            throw new RuntimeException(
                    "Allergy request is required"
            );
        }


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.UPDATE
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        SaasPatientAllergy allergy =
                findActiveAllergy(
                        tenantId,
                        allergyId
                );


        if (
                request.getTenantId() != null &&
                !tenantId.equals(
                        request.getTenantId()
                )
        ) {

            throw new RuntimeException(
                    "Invalid tenantId"
            );
        }


        if (
                request.getPatientId() != null &&
                !allergy
                        .getPatientId()
                        .equals(
                                request.getPatientId()
                        )
        ) {

            throw new RuntimeException(
                    "Allergy patient cannot be changed"
            );
        }


        validateAllergen(
                request.getAllergen()
        );


        applyRequest(
                allergy,
                request
        );


        allergy.setUpdatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        allergy.touch();


        return toResponse(
                allergyRepository.save(
                        allergy
                )
        );
    }


    /*
     * ================================================================
     * DELETE
     * ================================================================
     */

    @Transactional
    public ApiResponse deleteAllergy(
            Long tenantId,
            Long allergyId
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (allergyId == null) {

            throw new RuntimeException(
                    "allergyId is required"
            );
        }


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.DELETE
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        SaasPatientAllergy allergy =
                findActiveAllergy(
                        tenantId,
                        allergyId
                );


        allergy.setActive(
                false
        );

        allergy.setUpdatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        allergy.touch();


        allergyRepository.save(
                allergy
        );


        return new ApiResponse(
                true,
                "Patient allergy deleted successfully"
        );
    }


    /*
     * ================================================================
     * REQUEST MAPPING
     * ================================================================
     */

    private void applyRequest(
            SaasPatientAllergy allergy,
            SaasPatientAllergyRequest request
    ) {

        allergy.setAllergen(
                cleanRequiredText(
                        request.getAllergen()
                )
        );


        allergy.setAllergyType(
                cleanText(
                        request.getAllergyType()
                )
        );


        allergy.setReaction(
                cleanText(
                        request.getReaction()
                )
        );


        allergy.setSeverity(
                request.getSeverity() == null
                        ? SaasAllergySeverity.UNKNOWN
                        : request.getSeverity()
        );


        allergy.setStatus(
                request.getStatus() == null
                        ? SaasAllergyStatus.ACTIVE
                        : request.getStatus()
        );


        allergy.setOnsetDate(
                request.getOnsetDate()
        );


        allergy.setNotes(
                cleanText(
                        request.getNotes()
                )
        );
    }


    /*
     * ================================================================
     * VALIDATION
     * ================================================================
     */

    private void validateCreateRequest(
            SaasPatientAllergyRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Allergy request is required"
            );
        }


        if (request.getTenantId() == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (request.getPatientId() == null) {

            throw new RuntimeException(
                    "patientId is required"
            );
        }


        validateAllergen(
                request.getAllergen()
        );
    }


    private void validateAllergen(
            String allergen
    ) {

        if (
                allergen == null ||
                allergen.isBlank()
        ) {

            throw new RuntimeException(
                    "Allergen is required"
            );
        }


        if (
                allergen.trim().length() > 160
        ) {

            throw new RuntimeException(
                    "Allergen cannot exceed 160 characters"
            );
        }
    }


    private void validateIds(
            Long tenantId,
            Long patientId
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (patientId == null) {

            throw new RuntimeException(
                    "patientId is required"
            );
        }
    }


    private void validatePatient(
            Long tenantId,
            Long patientId
    ) {

        patientRepository
                .findByIdAndTenantIdAndActiveTrue(
                        patientId,
                        tenantId
                )
                .orElseThrow(
                        () ->
                                new RuntimeException(
                                        "Patient not found"
                                )
                );
    }


    private SaasPatientAllergy findActiveAllergy(
            Long tenantId,
            Long allergyId
    ) {

        return allergyRepository
                .findByIdAndTenantIdAndActiveTrue(
                        allergyId,
                        tenantId
                )
                .orElseThrow(
                        () ->
                                new RuntimeException(
                                        "Patient allergy not found"
                                )
                );
    }


    private String cleanRequiredText(
            String value
    ) {

        if (
                value == null ||
                value.isBlank()
        ) {

            throw new RuntimeException(
                    "Required allergy field is missing"
            );
        }


        return value.trim();
    }


    private String cleanText(
            String value
    ) {

        if (
                value == null ||
                value.isBlank()
        ) {

            return null;
        }


        return value.trim();
    }


    /*
     * ================================================================
     * RESPONSE
     * ================================================================
     */

    private SaasPatientAllergyResponse toResponse(
            SaasPatientAllergy allergy
    ) {

        return new SaasPatientAllergyResponse(

                allergy.getId(),

                allergy.getTenantId(),

                allergy.getPatientId(),

                allergy.getAllergen(),

                allergy.getAllergyType(),

                allergy.getReaction(),

                allergy.getSeverity(),

                allergy.getStatus(),

                allergy.getOnsetDate(),

                allergy.getNotes(),

                allergy.getActive(),

                allergy.getCreatedAt(),

                allergy.getUpdatedAt()
        );
    }
}