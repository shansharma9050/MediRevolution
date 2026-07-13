package com.example.medi.saas.repository;

import com.example.medi.saas.entity.TenantModuleSetting;
import com.example.medi.saas.enums.TenantModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantModuleSettingRepository extends JpaRepository<TenantModuleSetting, Long> {

    List<TenantModuleSetting> findByTenantId(Long tenantId);

    Optional<TenantModuleSetting> findByTenantIdAndModule(Long tenantId, TenantModule module);
}