package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasExpiryConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SaasExpiryConfigurationRepository extends JpaRepository<SaasExpiryConfiguration, Long> {

	Optional<SaasExpiryConfiguration> findByTenantId(Long tenantId);

	boolean existsByTenantId(Long tenantId);
}