package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasBed;
import com.example.medi.saas.enums.SaasBedStatus;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SaasBedRepository
        extends JpaRepository<SaasBed, Long> {

    List<SaasBed>
            findByTenantIdAndActiveTrueOrderByBedNumberAsc(
                    Long tenantId
            );

    List<SaasBed>
            findByTenantIdAndWardIdAndActiveTrueOrderByBedNumberAsc(
                    Long tenantId,
                    Long wardId
            );

    List<SaasBed>
            findByTenantIdAndStatusAndActiveTrueOrderByBedNumberAsc(
                    Long tenantId,
                    SaasBedStatus status
            );

    Optional<SaasBed>
            findByIdAndTenantIdAndActiveTrue(
                    Long id,
                    Long tenantId
            );


    /*
     * ================================================================
     * ATOMIC BED ALLOCATION
     * ================================================================
     */

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select b
            from SaasBed b
            where b.id = :bedId
              and b.tenantId = :tenantId
              and b.active = true
            """)
    Optional<SaasBed> findForUpdate(
            @Param("bedId")
            Long bedId,

            @Param("tenantId")
            Long tenantId
    );


    boolean existsByTenantIdAndWardIdAndBedNumberIgnoreCase(
            Long tenantId,
            Long wardId,
            String bedNumber
    );

    void deleteByTenantId(
            Long tenantId
    );
}