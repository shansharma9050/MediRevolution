package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPharmacySale;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SaasPharmacySaleRepository extends JpaRepository<SaasPharmacySale, Long> {

    List<SaasPharmacySale> findByTenantIdAndActiveTrueOrderBySaleDateTimeDesc(Long tenantId);

    Optional<SaasPharmacySale> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    List<SaasPharmacySale> findByTenantIdAndPatientIdAndActiveTrueOrderBySaleDateTimeDesc(
            Long tenantId,
            Long patientId
    );
    
    long countByTenantIdAndActiveTrue(Long tenantId);

    List<SaasPharmacySale> findByTenantIdAndSaleDateTimeBetweenAndActiveTrueOrderBySaleDateTimeDesc(
            Long tenantId,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    );
}