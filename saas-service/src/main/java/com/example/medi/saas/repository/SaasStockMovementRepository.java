package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasStockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasStockMovementRepository extends JpaRepository<SaasStockMovement, Long> {

	List<SaasStockMovement> findByTenantIdAndMedicineIdOrderByCreatedAtDesc(Long tenantId, Long medicineId);

	List<SaasStockMovement> findByTenantIdAndStockIdOrderByCreatedAtDesc(Long tenantId, Long stockId);

	List<SaasStockMovement> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
}