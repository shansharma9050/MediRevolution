package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPatientDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasPatientDocumentRepository
        extends JpaRepository<SaasPatientDocument, Long> {

    List<SaasPatientDocument>
            findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId,
                    Long patientId
            );

    Optional<SaasPatientDocument>
            findByIdAndTenantIdAndActiveTrue(
                    Long id,
                    Long tenantId
            );

    void deleteByTenantId(Long tenantId);
}