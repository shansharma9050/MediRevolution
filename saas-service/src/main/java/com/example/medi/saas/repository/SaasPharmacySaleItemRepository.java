package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPharmacySaleItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasPharmacySaleItemRepository extends JpaRepository<SaasPharmacySaleItem, Long> {

    List<SaasPharmacySaleItem> findByTenantIdAndSaleIdOrderByIdAsc(
            Long tenantId,
            Long saleId
    );
}