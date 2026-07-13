package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasOpdVisit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SaasOpdVisitRepository extends JpaRepository<SaasOpdVisit, Long> {

    List<SaasOpdVisit> findByTenantIdAndActiveTrueOrderByVisitDateTimeDesc(Long tenantId);

    Optional<SaasOpdVisit> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    List<SaasOpdVisit> findByTenantIdAndPatientIdAndActiveTrueOrderByVisitDateTimeDesc(
            Long tenantId,
            Long patientId
    );

    List<SaasOpdVisit> findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByVisitDateTimeDesc(
            Long tenantId,
            Long doctorProfileId
    );
    
    long countByTenantIdAndActiveTrue(Long tenantId);

    List<SaasOpdVisit> findByTenantIdAndVisitDateTimeBetweenAndActiveTrueOrderByVisitDateTimeDesc(
            Long tenantId,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    );
}