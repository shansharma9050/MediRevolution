package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSupplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SaasSupplierRepository
        extends JpaRepository<SaasSupplier, Long> {

    List<SaasSupplier>
    findByTenantIdOrderBySupplierNameAsc(
            Long tenantId
    );

    List<SaasSupplier>
    findByTenantIdAndActiveTrueOrderBySupplierNameAsc(
            Long tenantId
    );

    Optional<SaasSupplier>
    findByIdAndTenantId(
            Long id,
            Long tenantId
    );

    Optional<SaasSupplier>
    findByTenantIdAndSupplierCodeIgnoreCase(
            Long tenantId,
            String supplierCode
    );

    Optional<SaasSupplier>
    findByTenantIdAndSupplierCodeIgnoreCaseAndIdNot(
            Long tenantId,
            String supplierCode,
            Long id
    );

    Optional<SaasSupplier>
    findByTenantIdAndGstinIgnoreCase(
            Long tenantId,
            String gstin
    );

    Optional<SaasSupplier>
    findByTenantIdAndGstinIgnoreCaseAndIdNot(
            Long tenantId,
            String gstin,
            Long id
    );

    long countByTenantId(
            Long tenantId
    );

    long countByTenantIdAndActiveTrue(
            Long tenantId
    );

    @Query("""
            SELECT s
            FROM SaasSupplier s
            WHERE s.tenantId = :tenantId
              AND (
                    LOWER(s.supplierCode)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                 OR LOWER(s.supplierName)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                 OR LOWER(COALESCE(s.contactPersonName, ''))
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                 OR LOWER(COALESCE(s.mobile, ''))
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                 OR LOWER(COALESCE(s.email, ''))
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                 OR LOWER(COALESCE(s.gstin, ''))
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                 OR LOWER(COALESCE(s.city, ''))
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                 OR LOWER(COALESCE(s.state, ''))
                        LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            ORDER BY s.supplierName ASC
            """)
    List<SaasSupplier> searchSuppliers(
            @Param("tenantId")
            Long tenantId,

            @Param("keyword")
            String keyword
    );
}