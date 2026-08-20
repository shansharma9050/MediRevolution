package com.example.medi.saas.controller;

import com.example.medi.saas.dto.AddTenantMemberRequest;
import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.CreateTenantRequest;
import com.example.medi.saas.dto.TenantResponse;
import com.example.medi.saas.dto.WorkspaceAccessResponse;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.entity.TenantModuleSetting;
import com.example.medi.saas.security.CurrentUserUtil;
import com.example.medi.saas.service.SaasTenantService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/tenants")
public class SaasTenantController {

	private final SaasTenantService saasTenantService;

	@Value("${internal.service.key}")
	private String internalServiceKey;

	public SaasTenantController(SaasTenantService saasTenantService) {
		this.saasTenantService = saasTenantService;
	}

	@PostMapping
	public TenantResponse createTenant(@RequestBody CreateTenantRequest request) {
		return saasTenantService.createTenant(request);
	}

	@GetMapping("/my")
	public List<TenantResponse> myTenants() {
		return saasTenantService.myTenants();
	}

	@GetMapping("/{tenantId}")
	public TenantResponse getTenant(@PathVariable Long tenantId) {
		return saasTenantService.getTenant(tenantId);
	}

	@PostMapping("/{tenantId}/members")
	public ApiResponse addMember(@PathVariable Long tenantId, @RequestBody AddTenantMemberRequest request) {
		return saasTenantService.addMember(tenantId, request);
	}

	@GetMapping("/{tenantId}/members")
	public List<TenantMember> getMembers(@PathVariable Long tenantId) {
		return saasTenantService.getMembers(tenantId);
	}

	@GetMapping("/{tenantId}/modules")
	public List<TenantModuleSetting> getModules(@PathVariable Long tenantId) {
		return saasTenantService.getModules(tenantId);
	}

	@GetMapping("/{tenantId}/access")
	public WorkspaceAccessResponse checkWorkspaceAccess(@PathVariable Long tenantId, @RequestParam Long authUserId,
			@RequestHeader(value = "X-Internal-Service-Key", required = false) String providedInternalKey) {

		if (!isValidInternalServiceKey(providedInternalKey)) {

			throw new RuntimeException("Invalid internal service key");
		}

		boolean allowed = saasTenantService.hasWorkspaceAccess(tenantId, authUserId);

		return new WorkspaceAccessResponse(allowed, tenantId, authUserId,
				allowed ? "Workspace access allowed" : "Workspace access denied");
	}

	private boolean isValidInternalServiceKey(String providedKey) {

		return providedKey != null && !providedKey.isBlank() && providedKey.equals(internalServiceKey);
	}

	@DeleteMapping("/{tenantId}")
	public ApiResponse deleteWorkspace(@PathVariable Long tenantId) {

		Long authUserId = CurrentUserUtil.getUserId();

		saasTenantService.deleteWorkspace(tenantId, authUserId);

		return new ApiResponse(true, "SaaS workspace deleted successfully");
	}
}