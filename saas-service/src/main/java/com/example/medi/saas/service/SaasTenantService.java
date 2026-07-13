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

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class SaasTenantService {

    private final TenantRepository tenantRepository;
    private final TenantMemberRepository memberRepository;
    private final TenantModuleSettingRepository moduleRepository;
    private final SaasPermissionService permissionService;

    public SaasTenantService(
            TenantRepository tenantRepository,
            TenantMemberRepository memberRepository,
            TenantModuleSettingRepository moduleRepository,
            SaasPermissionService permissionService
    ) {
        this.tenantRepository = tenantRepository;
        this.memberRepository = memberRepository;
        this.moduleRepository = moduleRepository;
        this.permissionService = permissionService;
    }

    public TenantResponse createTenant(CreateTenantRequest request) {

        Long userId = CurrentUserUtil.getUserId();
        String role = CurrentUserUtil.getRole();

        if (userId == null) {
            throw new RuntimeException("User not found from token");
        }

        if (!"DOCTOR".equals(role) && !"HOSPITAL".equals(role) && !"WHOLESALER".equals(role)) {
            throw new RuntimeException("SaaS workspace is available only for Doctor, Hospital and Wholesaler");
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
        tenant.setContactEmail(request.getContactEmail());
        tenant.setContactMobile(request.getContactMobile());
        tenant.setAddress(request.getAddress());
        tenant.setCity(request.getCity());
        tenant.setState(request.getState());
        tenant.setPincode(request.getPincode());
        tenant.setStatus(TenantStatus.ACTIVE);

        Tenant savedTenant = tenantRepository.save(tenant);

        createOwnerMember(savedTenant);
        createDefaultModules(savedTenant);

        return toResponse(savedTenant);
    }

    public List<TenantResponse> myTenants() {
        Long userId = CurrentUserUtil.getUserId();

        List<TenantMember> memberships = memberRepository.findByAuthUserIdAndActiveTrue(userId);

        return memberships.stream()
                .map(member -> tenantRepository.findById(member.getTenantId()).orElse(null))
                .filter(tenant -> tenant != null && tenant.getStatus() == TenantStatus.ACTIVE)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public TenantResponse getTenant(Long tenantId) {
        Long userId = CurrentUserUtil.getUserId();

        memberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        return toResponse(tenant);
    }

    public ApiResponse addMember(Long tenantId, AddTenantMemberRequest request) {
        Long currentUserId = CurrentUserUtil.getUserId();

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        if (!tenant.getOwnerAuthUserId().equals(currentUserId)) {
            throw new RuntimeException("Only workspace owner can add members");
        }

        if (request.getAuthUserId() == null) {
            throw new RuntimeException("authUserId is required");
        }

        if (memberRepository.existsByTenantIdAndAuthUserId(tenantId, request.getAuthUserId())) {
            throw new RuntimeException("User already exists in workspace");
        }

        TenantMemberRole role = TenantMemberRole.valueOf(request.getMemberRole().toUpperCase());

        TenantMember member = new TenantMember();
        member.setTenantId(tenantId);
        member.setAuthUserId(request.getAuthUserId());
        member.setName(request.getName());
        member.setEmail(request.getEmail());
        member.setMobile(request.getMobile());
        member.setMemberRole(role);
        member.setActive(true);

        TenantMember savedMember = memberRepository.save(member);

        permissionService.assignDefaultPermissions(
                tenantId,
                savedMember.getAuthUserId(),
                savedMember.getMemberRole()
        );

        return new ApiResponse(true, "Member added successfully");

    }

    public List<TenantMember> getMembers(Long tenantId) {
        Long userId = CurrentUserUtil.getUserId();

        memberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

        return memberRepository.findByTenantIdAndActiveTrue(tenantId);
    }

    public List<TenantModuleSetting> getModules(Long tenantId) {
        Long userId = CurrentUserUtil.getUserId();

        memberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

        return moduleRepository.findByTenantId(tenantId);
    }

    private void createOwnerMember(Tenant tenant) {
        TenantMember member = new TenantMember();
        member.setTenantId(tenant.getId());
        member.setAuthUserId(tenant.getOwnerAuthUserId());
        member.setName(CurrentUserUtil.getUserName());
        member.setEmail(CurrentUserUtil.getEmail());
        member.setMemberRole(TenantMemberRole.OWNER);
        member.setActive(true);

        memberRepository.save(member);
    }

    private void createDefaultModules(Tenant tenant) {
        for (TenantModule module : TenantModule.values()) {
            TenantModuleSetting setting = new TenantModuleSetting();
            setting.setTenantId(tenant.getId());
            setting.setModule(module);
            setting.setEnabled(isModuleEnabledByDefault(tenant.getTenantType(), module));

            moduleRepository.save(setting);
        }
    }

    private boolean isModuleEnabledByDefault(TenantType tenantType, TenantModule module) {

        if (tenantType == TenantType.DOCTOR_CLINIC) {
            return switch (module) {
                case DASHBOARD,
                     PATIENTS,
                     APPOINTMENTS,
                     PRESCRIPTIONS,
                     BILLING,
                     REPORTS,
                     NOTIFICATIONS,
                     SETTINGS,
                     PERMISSIONS -> true;

                default -> false;
            };
        }

        if (tenantType == TenantType.HOSPITAL) {
            return true;
        }

        if (tenantType == TenantType.WHOLESALER) {
            return switch (module) {
                case DASHBOARD,
                     PHARMACY,
                     INVENTORY,
                     BILLING,
                     REPORTS,
                     NOTIFICATIONS,
                     SETTINGS,
                     PERMISSIONS -> true;

                default -> false;
            };
        }

        return false;
    }

    private TenantType resolveTenantType(String role, String requestedType) {
        if ("DOCTOR".equals(role)) {
            return TenantType.DOCTOR_CLINIC;
        }

        if ("HOSPITAL".equals(role)) {
            return TenantType.HOSPITAL;
        }

        if ("WHOLESALER".equals(role)) {
            return TenantType.WHOLESALER;
        }

        return TenantType.valueOf(requestedType.toUpperCase());
    }

    private String generateTenantCode(String tenantName) {
        String base = tenantName
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");

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

    private TenantResponse toResponse(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getTenantName(),
                tenant.getTenantCode(),
                tenant.getTenantType().name(),
                tenant.getStatus().name(),
                tenant.getOwnerAuthUserId().toString()
        );
    }
}