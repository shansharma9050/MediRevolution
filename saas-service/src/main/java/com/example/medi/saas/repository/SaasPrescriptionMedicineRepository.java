package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPrescriptionMedicine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SaasPrescriptionMedicineRepository
        extends JpaRepository<SaasPrescriptionMedicine, Long> {

    List<SaasPrescriptionMedicine> findByTenantIdAndPrescriptionIdOrderByIdAsc(
            Long tenantId,
            Long prescriptionId
    );

    List<SaasPrescriptionMedicine> findByTenantIdAndPrescriptionIdInOrderByPrescriptionIdDescIdAsc(
            Long tenantId,
            Collection<Long> prescriptionIds
    );

    void deleteByTenantIdAndPrescriptionId(
            Long tenantId,
            Long prescriptionId
    );

    void deleteByTenantId(Long tenantId);
}