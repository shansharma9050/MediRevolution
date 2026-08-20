package com.example.medi.saas.service;

import com.example.medi.saas.dto.AddTenantMemberRequest;
import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.CreateTenantRequest;
import com.example.medi.saas.dto.TenantResponse;
import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.entity.TenantModuleSetting;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.enums.TenantStatus;
import com.example.medi.saas.enums.TenantType;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.repository.TenantModuleSettingRepository;
import com.example.medi.saas.repository.TenantRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SaasTenantService {

	private final TenantRepository tenantRepository;
	private final TenantMemberRepository memberRepository;
	private final TenantModuleSettingRepository moduleRepository;
	private final SaasPermissionService permissionService;
	private final SaasDefaultModuleService defaultModuleService;
	private final SaasWorkspaceDeletionService saasWorkspaceDeletionService;
	private final BillingWorkspaceCleanupClient billingWorkspaceCleanupClient;

	public SaasTenantService(TenantRepository tenantRepository, TenantMemberRepository memberRepository,
			TenantModuleSettingRepository moduleRepository, SaasPermissionService permissionService,
			SaasDefaultModuleService defaultModuleService,SaasWorkspaceDeletionService saasWorkspaceDeletionService,BillingWorkspaceCleanupClient billingWorkspaceCleanupClient) {
		this.tenantRepository = tenantRepository;
		this.memberRepository = memberRepository;
		this.moduleRepository = moduleRepository;
		this.permissionService = permissionService;
		this.defaultModuleService = defaultModuleService;
		this.saasWorkspaceDeletionService=saasWorkspaceDeletionService;
		this.billingWorkspaceCleanupClient=billingWorkspaceCleanupClient;
	}

	@Transactional
	public TenantResponse createTenant(CreateTenantRequest request) {

		Long userId = CurrentUserUtil.getUserId();
		String role = normalizeRole(CurrentUserUtil.getRole());

		if (userId == null) {
			throw new RuntimeException("User not found from token");
		}

		if (role == null || role.isBlank()) {
			throw new RuntimeException("User role not found from token");
		}

		if (!isWorkspaceAllowedRole(role)) {
			throw new RuntimeException(
					"SaaS workspace is available only for Doctor, Hospital, Wholesaler and Retailer");
		}

		if (request == null) {
			throw new RuntimeException("Workspace request is required");
		}

		if (request.getTenantName() == null || request.getTenantName().isBlank()) {
			throw new RuntimeException("Workspace name is required");
		}

		TenantType tenantType = resolveTenantType(role, request.getTenantType());

		Tenant tenant = new Tenant();
		tenant.setOwnerAuthUserId(userId);
		tenant.setTenantName(request.getTenantName().trim());
		tenant.setTenantCode(generateTenantCode(request.getTenantName()));
		tenant.setTenantType(tenantType);
		tenant.setContactEmail(trimToNull(request.getContactEmail()));
		tenant.setContactMobile(trimToNull(request.getContactMobile()));
		tenant.setAddress(trimToNull(request.getAddress()));
		tenant.setCity(trimToNull(request.getCity()));
		tenant.setState(trimToNull(request.getState()));
		tenant.setPincode(trimToNull(request.getPincode()));
		tenant.setStatus(TenantStatus.PENDING);

		Tenant savedTenant = tenantRepository.save(tenant);

		TenantMember ownerMember = createOwnerMember(savedTenant);

		createDefaultModules(savedTenant);

		/*
		 * Owner/admin bypass agar already permission service me hai, tab bhi owner ki
		 * permission rows create karna future reporting, UI aur permission management
		 * ke liye useful rahega.
		 */
		permissionService.assignDefaultPermissions(savedTenant.getId(), ownerMember.getAuthUserId(),
				ownerMember.getMemberRole());

		return toResponse(savedTenant);
	}

	
	@Transactional
	public void deleteWorkspace(Long tenantId, Long authUserId) {

	    if (tenantId == null || tenantId <= 0) {
	        throw new RuntimeException("Valid SaaS workspace is required");
	    }

	    if (authUserId == null) {
	        throw new RuntimeException("User not authenticated");
	    }


	    Tenant tenant = tenantRepository.findById(tenantId)
	            .orElseThrow(() ->
	                    new RuntimeException(
	                            "SaaS workspace not found"));

	    if (!authUserId.equals(
	            tenant.getOwnerAuthUserId())) {

	        throw new RuntimeException(
	                "Only the SaaS workspace owner can permanently delete the workspace");
	    }

	    /*
	     * First clean Billing service.
	     */
	    billingWorkspaceCleanupClient
	            .deleteWorkspaceBillingData(tenantId);
	    
	    
	    saasWorkspaceDeletionService.deleteWorkspace(
	            tenantId,
	            authUserId
	    );
	}
	
	public List<TenantResponse> myTenants() {

		Long userId = CurrentUserUtil.getUserId();

		if (userId == null) {
			throw new RuntimeException("User not found from token");
		}

		List<TenantMember> memberships = memberRepository.findByAuthUserIdAndActiveTrue(userId);

		return memberships.stream().map(member -> tenantRepository.findById(member.getTenantId()).orElse(null))
				.filter(tenant -> tenant != null && tenant.getStatus() != TenantStatus.INACTIVE).map(this::toResponse)
				.collect(Collectors.toList());
	}

	public TenantResponse getTenant(Long tenantId) {

		Long userId = CurrentUserUtil.getUserId();

		if (tenantId == null) {
			throw new RuntimeException("Workspace id is required");
		}

		if (userId == null) {
			throw new RuntimeException("User not found from token");
		}

		Tenant tenant = tenantRepository.findById(tenantId)
				.orElseThrow(() -> new RuntimeException("Workspace not found"));

		/*
		 * First check membership.
		 */
		memberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, userId)
				.orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

		/*
		 * Then enforce subscription.
		 */
		validateTenantSubscriptionStatus(tenant);

		return toResponse(tenant);
	}

	private void validateTenantSubscriptionStatus(Tenant tenant) {

		if (tenant == null) {
			throw new RuntimeException("Workspace not found");
		}

		TenantStatus status = tenant.getStatus();

		if (status == null) {
			throw new RuntimeException("Workspace status is not configured");
		}

		if (status == TenantStatus.PENDING) {

			throw new RuntimeException("Workspace subscription is required. Please choose a plan.");
		}

		if (status == TenantStatus.SUSPENDED) {

			throw new RuntimeException("Workspace subscription has expired. Please renew your subscription.");
		}

		if (status != TenantStatus.ACTIVE) {

			throw new RuntimeException("Workspace is not active.");
		}
	}

	@Transactional
	public TenantResponse activateWorkspace(Long tenantId, Long authUserId) {

		if (tenantId == null || tenantId <= 0) {
			throw new RuntimeException("Workspace id is required");
		}

		if (authUserId == null) {
			throw new RuntimeException("User id is required");
		}

		Tenant tenant = tenantRepository.findById(tenantId)
				.orElseThrow(() -> new RuntimeException("Workspace not found"));

		/*
		 * Only workspace owner can activate subscription for this workspace.
		 */
		if (!tenant.getOwnerAuthUserId().equals(authUserId)) {
			throw new RuntimeException("Only workspace owner can activate subscription");
		}

		tenant.setStatus(TenantStatus.ACTIVE);
		tenant.touch();

		Tenant saved = tenantRepository.save(tenant);

		return toResponse(saved);
	}

	@Transactional
	public TenantResponse suspendWorkspace(Long tenantId) {

		if (tenantId == null || tenantId <= 0) {
			throw new RuntimeException("Workspace id is required");
		}

		Tenant tenant = tenantRepository.findById(tenantId)
				.orElseThrow(() -> new RuntimeException("Workspace not found"));

		tenant.setStatus(TenantStatus.SUSPENDED);
		tenant.touch();

		Tenant saved = tenantRepository.save(tenant);

		return toResponse(saved);
	}

	@Transactional
	public ApiResponse addMember(Long tenantId, AddTenantMemberRequest request) {

		Long currentUserId = CurrentUserUtil.getUserId();

		if (tenantId == null) {
			throw new RuntimeException("Workspace id is required");
		}

		if (currentUserId == null) {
			throw new RuntimeException("User not found from token");
		}

		if (request == null) {
			throw new RuntimeException("Member request is required");
		}

		Tenant tenant = tenantRepository.findById(tenantId)
				.orElseThrow(() -> new RuntimeException("Workspace not found"));

		if (!tenant.getOwnerAuthUserId().equals(currentUserId)) {
			throw new RuntimeException("Only workspace owner can add members");
		}

		if (request.getAuthUserId() == null) {
			throw new RuntimeException("authUserId is required");
		}

		if (request.getMemberRole() == null || request.getMemberRole().isBlank()) {
			throw new RuntimeException("Member role is required");
		}

		if (memberRepository.existsByTenantIdAndAuthUserId(tenantId, request.getAuthUserId())) {
			throw new RuntimeException("User already exists in workspace");
		}

		TenantMemberRole memberRole;

		try {
			memberRole = TenantMemberRole.valueOf(request.getMemberRole().trim().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException ex) {
			throw new RuntimeException("Invalid member role: " + request.getMemberRole());
		}

		/*
		 * Kisi member ko API ke through OWNER role assign mat hone do. Owner workspace
		 * creation ke time automatically create hota hai.
		 */
		if (memberRole == TenantMemberRole.OWNER) {
			throw new RuntimeException("OWNER role cannot be assigned manually");
		}

		TenantMember member = new TenantMember();
		member.setTenantId(tenantId);
		member.setAuthUserId(request.getAuthUserId());
		member.setName(trimToNull(request.getName()));
		member.setEmail(trimToNull(request.getEmail()));
		member.setMobile(trimToNull(request.getMobile()));
		member.setMemberRole(memberRole);
		member.setActive(true);

		TenantMember savedMember = memberRepository.save(member);

		permissionService.assignDefaultPermissions(tenantId, savedMember.getAuthUserId(), savedMember.getMemberRole());

		return new ApiResponse(true, "Member added successfully");
	}

	public List<TenantMember> getMembers(Long tenantId) {

		requireActiveTenant(tenantId);

		Long userId = CurrentUserUtil.getUserId();

		if (tenantId == null) {
			throw new RuntimeException("Workspace id is required");
		}

		if (userId == null) {
			throw new RuntimeException("User not found from token");
		}

		memberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, userId)
				.orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

		return memberRepository.findByTenantIdAndActiveTrue(tenantId);
	}

	public List<TenantModuleSetting> getModules(Long tenantId) {

		requireActiveTenant(tenantId);

		Long userId = CurrentUserUtil.getUserId();

		if (tenantId == null) {
			throw new RuntimeException("Workspace id is required");
		}

		if (userId == null) {
			throw new RuntimeException("User not found from token");
		}

		memberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, userId)
				.orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

		return moduleRepository.findByTenantId(tenantId);
	}

	private Tenant requireActiveTenant(Long tenantId) {

		Tenant tenant = tenantRepository.findById(tenantId)
				.orElseThrow(() -> new RuntimeException("Workspace not found"));

		if (tenant.getStatus() != TenantStatus.ACTIVE) {

			if (tenant.getStatus() == TenantStatus.PENDING) {

				throw new RuntimeException("Workspace subscription is required.");
			}

			if (tenant.getStatus() == TenantStatus.SUSPENDED) {

				throw new RuntimeException("Workspace subscription has expired.");
			}

			throw new RuntimeException("Workspace is not active.");
		}

		return tenant;
	}

	private TenantMember createOwnerMember(Tenant tenant) {

		TenantMember member = new TenantMember();
		member.setTenantId(tenant.getId());
		member.setAuthUserId(tenant.getOwnerAuthUserId());
		member.setName(trimToNull(CurrentUserUtil.getUserName()));
		member.setEmail(trimToNull(CurrentUserUtil.getEmail()));
		member.setMemberRole(TenantMemberRole.OWNER);
		member.setActive(true);

		return memberRepository.save(member);
	}

	private void createDefaultModules(Tenant tenant) {

		Set<TenantModule> enabledModules = defaultModuleService.getDefaultModules(tenant.getTenantType());

		for (TenantModule module : TenantModule.values()) {

			TenantModuleSetting setting = new TenantModuleSetting();

			setting.setTenantId(tenant.getId());
			setting.setModule(module);
			setting.setEnabled(enabledModules.contains(module));

			moduleRepository.save(setting);
		}
	}

	private boolean isWorkspaceAllowedRole(String role) {

		return "DOCTOR".equals(role) || "HOSPITAL".equals(role) || "WHOLESALER".equals(role) || "RETAILER".equals(role);
	}

	private TenantType resolveTenantType(String role, String requestedType) {

		return switch (role) {

		case "DOCTOR" -> TenantType.DOCTOR_CLINIC;

		case "HOSPITAL" -> TenantType.HOSPITAL;

		case "WHOLESALER" -> TenantType.WHOLESALER;

		case "RETAILER" -> TenantType.RETAILER;

		default -> resolveRequestedTenantType(requestedType);
		};
	}

	private TenantType resolveRequestedTenantType(String requestedType) {

		if (requestedType == null || requestedType.isBlank()) {
			throw new RuntimeException("Workspace type is required");
		}

		try {
			return TenantType.valueOf(requestedType.trim().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException ex) {
			throw new RuntimeException("Invalid workspace type: " + requestedType);
		}
	}

	private String normalizeRole(String role) {

		if (role == null) {
			return null;
		}

		String normalizedRole = role.trim().toUpperCase(Locale.ROOT);

		if (normalizedRole.startsWith("ROLE_")) {
			normalizedRole = normalizedRole.substring("ROLE_".length());
		}

		return normalizedRole;
	}

	private String generateTenantCode(String tenantName) {

		String base = tenantName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");

		if (base.isBlank()) {
			base = "workspace";
		}

		String code = base;
		int counter = 1;

		while (tenantRepository.findByTenantCode(code).isPresent()) {

			code = base + "-" + counter;
			counter++;
		}

		return code;
	}

	private String trimToNull(String value) {

		if (value == null) {
			return null;
		}

		String trimmed = value.trim();

		return trimmed.isEmpty() ? null : trimmed;
	}

	private TenantResponse toResponse(Tenant tenant) {

		return new TenantResponse(tenant.getId(), tenant.getTenantName(), tenant.getTenantCode(),
				tenant.getTenantType().name(), tenant.getStatus().name(), tenant.getOwnerAuthUserId().toString());
	}

	public boolean hasWorkspaceAccess(Long tenantId, Long authUserId) {

		if (tenantId == null || tenantId <= 0) {
			return false;
		}

		if (authUserId == null) {
			return false;
		}

		Tenant tenant = tenantRepository.findById(tenantId).orElse(null);

		if (tenant == null) {
			return false;
		}

		/*
		 * Workspace itself must be active.
		 */
		/*
		 * if (!TenantStatus.ACTIVE.equals(tenant.getStatus())) { return false; }
		 */

		/*
		 * Owner automatically has workspace access.
		 */
		if (tenant.getOwnerAuthUserId().equals(authUserId)) {

			return true;
		}

		/*
		 * Other users must be active members.
		 */
		return memberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, authUserId).isPresent();
	}
}