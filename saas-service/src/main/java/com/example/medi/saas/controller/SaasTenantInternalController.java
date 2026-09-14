package com.example.medi.saas.controller;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import com.example.medi.saas.dto.TenantResponse;
import com.example.medi.saas.service.SaasTenantService;

@RestController
@RequestMapping("/saas/internal")
public class SaasTenantInternalController {

	private final SaasTenantService saasTenantService;

	@Value("${internal.service.key}")
	private String internalServiceKey;

	public SaasTenantInternalController(SaasTenantService saasTenantService) {

		this.saasTenantService = saasTenantService;
	}

	/**
	 * Called by Billing service after a workspace subscription has been
	 * successfully activated/renewed.
	 *
	 * The subscription dates are copied to the SaaS workspace so Tenant.validFrom /
	 * Tenant.validUntil stay synchronized with UserSubscription.
	 */
	@PostMapping("/tenants/{tenantId}/subscription/activate")
	public TenantResponse activateWorkspace(@PathVariable Long tenantId, @RequestParam Long authUserId,
			@RequestParam LocalDate validFrom, @RequestParam LocalDate validUntil,
			@RequestHeader(value = "X-Internal-Service-Key", required = false) String serviceKey) {

		validateInternalKey(serviceKey);

		return saasTenantService.activateWorkspace(tenantId, authUserId, validFrom, validUntil);
	}

	/**
	 * Called by Billing service when a workspace subscription expires.
	 */
	@PostMapping("/tenants/{tenantId}/subscription/suspend")
	public TenantResponse suspendWorkspace(@PathVariable Long tenantId,
			@RequestHeader(value = "X-Internal-Service-Key", required = false) String serviceKey) {

		validateInternalKey(serviceKey);

		return saasTenantService.suspendWorkspace(tenantId);
	}

	private void validateInternalKey(String serviceKey) {

		if (serviceKey == null || serviceKey.isBlank()) {
			throw new RuntimeException("Internal service key missing");
		}

		if (!internalServiceKey.equals(serviceKey)) {
			throw new RuntimeException("Invalid internal service key");
		}
	}
}