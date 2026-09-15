package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPatientMerge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasPatientMergeRepository
        extends JpaRepository<SaasPatientMerge, Long> {

    boolean existsByTenantIdAndSourcePatientIdAndStatus(
            Long tenantId,
            Long sourcePatientId,
            String status
    );

    boolean existsByTenantIdAndTargetPatientIdAndStatus(
            Long tenantId,
            Long targetPatientId,
            String status
    );

    Optional<SaasPatientMerge>
            findByIdAndTenantId(
                    Long id,
                    Long tenantId
            );

    Optional<SaasPatientMerge>
            findFirstByTenantIdAndSourceAuthUserIdAndStatusOrderByMergedAtDesc(
                    Long tenantId,
                    Long sourceAuthUserId,
                    String status
            );

    List<SaasPatientMerge>
            findByTenantIdAndTargetPatientIdOrderByMergedAtDesc(
                    Long tenantId,
                    Long targetPatientId
            );

    void deleteByTenantId(
            Long tenantId
    );
}