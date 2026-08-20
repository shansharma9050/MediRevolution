package com.example.medi.saas.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import com.example.medi.saas.dto.ApiResponse;
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

	@PostMapping("/tenants/{tenantId}/subscription/activate")
	public TenantResponse activateWorkspace(@PathVariable Long tenantId, @RequestParam Long authUserId,
			@RequestHeader(value = "X-Internal-Service-Key", required = false) String serviceKey) {

		validateInternalKey(serviceKey);

		return saasTenantService.activateWorkspace(tenantId, authUserId);
	}

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