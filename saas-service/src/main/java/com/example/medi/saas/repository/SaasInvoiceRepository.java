package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SaasInvoiceRepository extends JpaRepository<SaasInvoice, Long> {

    List<SaasInvoice> findByTenantIdAndActiveTrueOrderByInvoiceDateTimeDesc(Long tenantId);

    Optional<SaasInvoice> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    List<SaasInvoice> findByTenantIdAndPatientIdAndActiveTrueOrderByInvoiceDateTimeDesc(
            Long tenantId,
            Long patientId
    );

    List<SaasInvoice> findByTenantIdAndIpdAdmissionIdAndActiveTrueOrderByInvoiceDateTimeDesc(
            Long tenantId,
            Long ipdAdmissionId
    );

    List<SaasInvoice> findByTenantIdAndOpdVisitIdAndActiveTrueOrderByInvoiceDateTimeDesc(
            Long tenantId,
            Long opdVisitId
    );
    
    long countByTenantIdAndActiveTrue(Long tenantId);

    List<SaasInvoice> findByTenantIdAndInvoiceDateTimeBetweenAndActiveTrueOrderByInvoiceDateTimeDesc(
            Long tenantId,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    );
}