package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasIpdCharge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasIpdChargeRepository extends JpaRepository<SaasIpdCharge, Long> {

    List<SaasIpdCharge> findByTenantIdAndAdmissionIdOrderByChargeDateTimeDesc(
            Long tenantId,
            Long admissionId
    );
}