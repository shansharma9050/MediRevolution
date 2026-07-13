package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasDiagnosticOrder;
import com.example.medi.saas.enums.SaasDiagnosticType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SaasDiagnosticOrderRepository extends JpaRepository<SaasDiagnosticOrder, Long> {

    List<SaasDiagnosticOrder> findByTenantIdAndActiveTrueOrderByOrderDateTimeDesc(Long tenantId);

    List<SaasDiagnosticOrder> findByTenantIdAndDiagnosticTypeAndActiveTrueOrderByOrderDateTimeDesc(
            Long tenantId,
            SaasDiagnosticType diagnosticType
    );

    Optional<SaasDiagnosticOrder> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    List<SaasDiagnosticOrder> findByTenantIdAndPatientIdAndActiveTrueOrderByOrderDateTimeDesc(
            Long tenantId,
            Long patientId
    );

    List<SaasDiagnosticOrder> findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByOrderDateTimeDesc(
            Long tenantId,
            Long doctorProfileId
    );
    
    long countByTenantIdAndDiagnosticTypeAndActiveTrue(
            Long tenantId,
            SaasDiagnosticType diagnosticType
    );

    List<SaasDiagnosticOrder> findByTenantIdAndDiagnosticTypeAndOrderDateTimeBetweenAndActiveTrueOrderByOrderDateTimeDesc(
            Long tenantId,
            SaasDiagnosticType diagnosticType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    );
}