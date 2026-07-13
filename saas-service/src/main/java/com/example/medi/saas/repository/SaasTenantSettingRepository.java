package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasTenantSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SaasTenantSettingRepository extends JpaRepository<SaasTenantSetting, Long> {

    Optional<SaasTenantSetting> findByTenantIdAndActiveTrue(Long tenantId);

    Optional<SaasTenantSetting> findByTenantId(Long tenantId);
}