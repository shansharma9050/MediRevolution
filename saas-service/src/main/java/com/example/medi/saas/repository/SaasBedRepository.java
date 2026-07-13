package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasBed;
import com.example.medi.saas.enums.SaasBedStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasBedRepository extends JpaRepository<SaasBed, Long> {

    List<SaasBed> findByTenantIdAndActiveTrueOrderByBedNumberAsc(Long tenantId);

    List<SaasBed> findByTenantIdAndWardIdAndActiveTrueOrderByBedNumberAsc(Long tenantId, Long wardId);

    List<SaasBed> findByTenantIdAndStatusAndActiveTrueOrderByBedNumberAsc(
            Long tenantId,
            SaasBedStatus status
    );

    Optional<SaasBed> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);
    
    boolean existsByTenantIdAndWardIdAndBedNumberIgnoreCase(
            Long tenantId,
            Long wardId,
            String bedNumber
    );
}