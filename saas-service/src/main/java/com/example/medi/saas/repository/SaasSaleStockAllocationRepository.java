package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSaleStockAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasSaleStockAllocationRepository extends JpaRepository<SaasSaleStockAllocation, Long> {

	List<SaasSaleStockAllocation> findByTenantIdAndSaleItemIdOrderByIdAsc(Long tenantId, Long saleItemId);

	List<SaasSaleStockAllocation> findByTenantIdAndSaleIdOrderByIdAsc(Long tenantId, Long saleId);

	Optional<SaasSaleStockAllocation> findByIdAndTenantIdAndSaleId(Long id, Long tenantId, Long saleId);
}