package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPatient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasPatientRepository extends JpaRepository<SaasPatient, Long> {

    List<SaasPatient> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

    Optional<SaasPatient> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    List<SaasPatient> findByTenantIdAndActiveTrueAndPatientNameContainingIgnoreCaseOrderByCreatedAtDesc(
            Long tenantId,
            String patientName
    );

    List<SaasPatient> findByTenantIdAndActiveTrueAndMobileContainingOrderByCreatedAtDesc(
            Long tenantId,
            String mobile
    );

    long countByTenantId(Long tenantId);
    
    long countByTenantIdAndActiveTrue(Long tenantId);
}