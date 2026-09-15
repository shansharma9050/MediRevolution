package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasPatientResponse;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasPatientMerge;
import com.example.medi.saas.repository.SaasPatientMergeRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class SaasPatientSelfResolverService {

    private final SaasPatientRepository patientRepository;

    private final SaasPatientMergeRepository mergeRepository;


    public SaasPatientSelfResolverService(
            SaasPatientRepository patientRepository,
            SaasPatientMergeRepository mergeRepository
    ) {

        this.patientRepository =
                patientRepository;

        this.mergeRepository =
                mergeRepository;
    }


    /*
     * ================================================================
     * CURRENT PATIENT RESPONSE
     * ================================================================
     */

    @Transactional(readOnly = true)
    public SaasPatientResponse getMyPatient(
            Long tenantId
    ) {

        return toResponse(
                resolvePatientEntity(
                        tenantId
                )
        );
    }


    /*
     * ================================================================
     * CANONICAL PATIENT RESOLUTION
     * ================================================================
     *
     * Resolution order:
     *
     * 1. Normal active patient linked directly with logged-in auth user.
     * 2. If that patient was merged, resolve the currently active
     *    canonical target patient using the merge audit.
     *
     * Browser supplied patientId is never trusted here.
     */

    @Transactional(readOnly = true)
    public SaasPatient resolvePatientEntity(
            Long tenantId
    ) {

        Long authUserId =
                CurrentUserUtil.getUserId();


        if (authUserId == null) {

            throw new AccessDeniedException(
                    "Logged-in patient user ID not found."
            );
        }


        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required."
            );
        }


        Optional<SaasPatient> directPatient =
                patientRepository
                        .findByAuthUserIdAndTenantIdAndActiveTrue(
                                authUserId,
                                tenantId
                        );


        if (directPatient.isPresent()) {

            return directPatient.get();
        }


        Optional<SaasPatientMerge> activeMerge =
                mergeRepository
                        .findFirstByTenantIdAndSourceAuthUserIdAndStatusOrderByMergedAtDesc(
                                tenantId,
                                authUserId,
                                "MERGED"
                        );


        if (activeMerge.isPresent()) {

            Long canonicalPatientId =
                    activeMerge
                            .get()
                            .getTargetPatientId();


            return patientRepository
                    .findByIdAndTenantIdAndActiveTrue(
                            canonicalPatientId,
                            tenantId
                    )
                    .orElseThrow(
                            () ->
                                    new AccessDeniedException(
                                            "Canonical patient record is unavailable."
                                    )
                    );
        }


        throw new AccessDeniedException(
                "You are not assigned to this workspace as a patient."
        );
    }


    /*
     * ================================================================
     * RESPONSE
     * ================================================================
     */

    private SaasPatientResponse toResponse(
            SaasPatient patient
    ) {

        return new SaasPatientResponse(

                patient.getId(),

                patient.getTenantId(),

                patient.getPatientCode(),

                patient.getPatientName(),

                patient.getMobile(),

                patient.getEmail(),

                patient.getGender(),

                patient.getDateOfBirth(),

                patient.getAge(),

                patient.getBloodGroup(),

                patient.getAddress(),

                patient.getCity(),

                patient.getState(),

                patient.getPincode(),

                patient.getEmergencyContactName(),

                patient.getEmergencyContactMobile(),

                patient.getAllergies(),

                patient.getExistingDiseases(),

                patient.getNotes(),

                patient.getActive(),

                patient.getCreatedAt()
        );
    }
}