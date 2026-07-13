package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasMedicineStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasMedicineStockRepository extends JpaRepository<SaasMedicineStock, Long> {

    List<SaasMedicineStock> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

    List<SaasMedicineStock> findByTenantIdAndMedicineIdAndActiveTrueOrderByExpiryDateAsc(
            Long tenantId,
            Long medicineId
    );

    List<SaasMedicineStock> findByTenantIdAndMedicineIdAndCurrentQuantityGreaterThanAndActiveTrueOrderByExpiryDateAsc(
            Long tenantId,
            Long medicineId,
            Integer currentQuantity
    );

    Optional<SaasMedicineStock> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);
}