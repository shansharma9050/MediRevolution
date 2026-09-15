package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPatientAllergy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasPatientAllergyRepository
        extends JpaRepository<SaasPatientAllergy, Long> {

    List<SaasPatientAllergy>
            findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId,
                    Long patientId
            );

    Optional<SaasPatientAllergy>
            findByIdAndTenantIdAndActiveTrue(
                    Long id,
                    Long tenantId
            );

    void deleteByTenantId(
            Long tenantId
    );
}