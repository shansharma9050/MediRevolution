package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasPurchaseItemRepository extends JpaRepository<SaasPurchaseItem, Long> {

	List<SaasPurchaseItem> findByTenantIdAndPurchaseIdOrderByIdAsc(Long tenantId, Long purchaseId);

	Optional<SaasPurchaseItem> findByIdAndTenantIdAndPurchaseId(Long id, Long tenantId, Long purchaseId);
}