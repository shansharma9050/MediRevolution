package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasMedicine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasMedicineRepository extends JpaRepository<SaasMedicine, Long> {

    List<SaasMedicine> findByTenantIdAndActiveTrueOrderByMedicineNameAsc(Long tenantId);

    Optional<SaasMedicine> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    List<SaasMedicine> findByTenantIdAndActiveTrueAndMedicineNameContainingIgnoreCaseOrderByMedicineNameAsc(
            Long tenantId,
            String medicineName
    );
}