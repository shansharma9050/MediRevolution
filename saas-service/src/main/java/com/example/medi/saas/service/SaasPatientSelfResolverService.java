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


    @Transactional(readOnly = true)
    public SaasPatientResponse getMyPatient(
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

            return toResponse(
                    directPatient.get()
            );
        }


        Optional<SaasPatientMerge> merge =
                mergeRepository
                        .findFirstByTenantIdAndSourceAuthUserIdAndStatusOrderByMergedAtDesc(
                                tenantId,
                                authUserId,
                                "MERGED"
                        );


        if (merge.isPresent()) {

            SaasPatient canonicalPatient =
                    patientRepository
                            .findByIdAndTenantIdAndActiveTrue(
                                    merge.get()
                                            .getTargetPatientId(),
                                    tenantId
                            )
                            .orElseThrow(
                                    () ->
                                            new AccessDeniedException(
                                                    "Canonical patient record is unavailable."
                                            )
                            );


            return toResponse(
                    canonicalPatient
            );
        }


        throw new AccessDeniedException(
                "You are not assigned to this workspace as a patient."
        );
    }


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