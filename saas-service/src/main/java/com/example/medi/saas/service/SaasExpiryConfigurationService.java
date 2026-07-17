package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasExpiryConfigurationRequest;
import com.example.medi.saas.dto.SaasExpiryConfigurationResponse;
import com.example.medi.saas.entity.SaasExpiryConfiguration;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasExpiryConfigurationRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaasExpiryConfigurationService {

	private static final int DEFAULT_NEAR_EXPIRY_DAYS = 90;
	private static final int DEFAULT_CRITICAL_EXPIRY_DAYS = 30;

	private final SaasExpiryConfigurationRepository configurationRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;

	public SaasExpiryConfigurationService(SaasExpiryConfigurationRepository configurationRepository,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService) {
		this.configurationRepository = configurationRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
	}

	@Transactional
	public SaasExpiryConfigurationResponse getConfiguration(Long tenantId) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.EXPIRY_MANAGEMENT, SaasPermissionAction.VIEW);

		return toResponse(getOrCreateConfigurationEntity(tenantId));
	}

	@Transactional
	public SaasExpiryConfigurationResponse updateConfiguration(SaasExpiryConfigurationRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.EXPIRY_MANAGEMENT, SaasPermissionAction.UPDATE);

		SaasExpiryConfiguration configuration = getOrCreateConfigurationEntity(tenantId);

		configuration.setNearExpiryDays(request.getNearExpiryDays());

		configuration.setCriticalExpiryDays(request.getCriticalExpiryDays());

		configuration.setAlertEnabled(Boolean.TRUE.equals(request.getAlertEnabled()));

		configuration.setDailyAlertEnabled(Boolean.TRUE.equals(request.getDailyAlertEnabled()));

		configuration.setIncludeZeroStockBatches(Boolean.TRUE.equals(request.getIncludeZeroStockBatches()));

		configuration.setAutoQuarantineExpiredStock(Boolean.TRUE.equals(request.getAutoQuarantineExpiredStock()));

		configuration.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		return toResponse(configurationRepository.save(configuration));
	}

	@Transactional
	public SaasExpiryConfiguration getOrCreateConfigurationEntity(Long tenantId) {

		validateTenantId(tenantId);

		return configurationRepository.findByTenantId(tenantId).orElseGet(() -> createDefaultConfiguration(tenantId));
	}

	private SaasExpiryConfiguration createDefaultConfiguration(Long tenantId) {

		SaasExpiryConfiguration configuration = new SaasExpiryConfiguration();

		configuration.setTenantId(tenantId);

		configuration.setNearExpiryDays(DEFAULT_NEAR_EXPIRY_DAYS);

		configuration.setCriticalExpiryDays(DEFAULT_CRITICAL_EXPIRY_DAYS);

		configuration.setAlertEnabled(true);

		configuration.setDailyAlertEnabled(true);

		configuration.setIncludeZeroStockBatches(false);

		configuration.setAutoQuarantineExpiredStock(false);

		configuration.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		return configurationRepository.save(configuration);
	}

	private void validateRequest(SaasExpiryConfigurationRequest request) {

		if (request == null) {
			throw new RuntimeException("Expiry configuration request is required");
		}

		validateTenantId(request.getTenantId());

		if (request.getNearExpiryDays() == null || request.getNearExpiryDays() < 1) {
			throw new RuntimeException("Near-expiry days must be greater than 0");
		}

		if (request.getCriticalExpiryDays() == null || request.getCriticalExpiryDays() < 1) {
			throw new RuntimeException("Critical-expiry days must be greater than 0");
		}

		if (request.getCriticalExpiryDays() > request.getNearExpiryDays()) {
			throw new RuntimeException("Critical-expiry days cannot exceed near-expiry days");
		}

		if (request.getNearExpiryDays() > 3650) {
			throw new RuntimeException("Near-expiry days cannot exceed 3650");
		}
	}

	private SaasExpiryConfigurationResponse toResponse(SaasExpiryConfiguration configuration) {

		return new SaasExpiryConfigurationResponse(configuration.getId(), configuration.getTenantId(),
				configuration.getNearExpiryDays(), configuration.getCriticalExpiryDays(),
				configuration.getAlertEnabled(), configuration.getDailyAlertEnabled(),
				configuration.getIncludeZeroStockBatches(), configuration.getAutoQuarantineExpiredStock(),
				configuration.getCreatedAt(), configuration.getUpdatedAt());
	}

	private void validateTenantAccess(Long tenantId) {

		validateTenantId(tenantId);

		tenantAccessService.validateTenantAccess(tenantId);
	}

	private void validateTenantId(Long tenantId) {

		if (tenantId == null) {
			throw new RuntimeException("tenantId is required");
		}
	}
}