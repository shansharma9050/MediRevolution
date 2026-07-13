package com.example.medi.saas.repository;

import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.enums.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantRepository extends JpaRepository<Tenant, Long> {

    Optional<Tenant> findByTenantCode(String tenantCode);

    List<Tenant> findByOwnerAuthUserIdAndStatus(Long ownerAuthUserId, TenantStatus status);
}