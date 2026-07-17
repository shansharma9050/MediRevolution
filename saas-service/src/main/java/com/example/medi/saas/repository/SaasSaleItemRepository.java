package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSaleItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasSaleItemRepository
        extends JpaRepository<SaasSaleItem, Long> {

    List<SaasSaleItem>
    findByTenantIdAndSaleIdOrderByIdAsc(
            Long tenantId,
            Long saleId
    );
}