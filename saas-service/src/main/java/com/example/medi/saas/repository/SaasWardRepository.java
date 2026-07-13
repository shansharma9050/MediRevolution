package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasWard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasWardRepository extends JpaRepository<SaasWard, Long> {

    List<SaasWard> findByTenantIdAndActiveTrueOrderByWardNameAsc(Long tenantId);

    Optional<SaasWard> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);
    
    boolean existsByTenantIdAndWardNameIgnoreCase(Long tenantId, String wardName);
}