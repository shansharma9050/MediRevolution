package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasIpdAdmission;
import com.example.medi.saas.enums.SaasIpdStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SaasIpdAdmissionRepository extends JpaRepository<SaasIpdAdmission, Long> {

    List<SaasIpdAdmission> findByTenantIdAndActiveTrueOrderByAdmissionDateTimeDesc(Long tenantId);

    Optional<SaasIpdAdmission> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    List<SaasIpdAdmission> findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(
            Long tenantId,
            Long patientId
    );

    List<SaasIpdAdmission> findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByAdmissionDateTimeDesc(
            Long tenantId,
            Long doctorProfileId
    );

    boolean existsByTenantIdAndBedIdAndStatusAndActiveTrue(
            Long tenantId,
            Long bedId,
            SaasIpdStatus status
    );
    
    long countByTenantIdAndStatusAndActiveTrue(
            Long tenantId,
            SaasIpdStatus status
    );

    List<SaasIpdAdmission> findByTenantIdAndAdmissionDateTimeBetweenAndActiveTrueOrderByAdmissionDateTimeDesc(
            Long tenantId,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    );
}