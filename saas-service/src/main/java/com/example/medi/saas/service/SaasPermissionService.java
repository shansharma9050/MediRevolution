package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.SaasTenantMemberPermission;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasTenantMemberPermissionRepository;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class SaasPermissionService {

    private final SaasTenantMemberPermissionRepository permissionRepository;
    private final TenantMemberRepository tenantMemberRepository;
    private final TenantAccessService tenantAccessService;

    public SaasPermissionService(
            SaasTenantMemberPermissionRepository permissionRepository,
            TenantMemberRepository tenantMemberRepository,
            TenantAccessService tenantAccessService
    ) {
        this.permissionRepository = permissionRepository;
        this.tenantMemberRepository = tenantMemberRepository;
        this.tenantAccessService = tenantAccessService;
    }

    public List<SaasTenantMemberWithPermissionResponse> getTenantMembers(Long tenantId) {

        tenantAccessService.validateOwnerOrAdmin(tenantId);

        return tenantMemberRepository
                .findByTenantIdAndActiveTrue(tenantId)
                .stream()
                .map(member -> new SaasTenantMemberWithPermissionResponse(
                        member.getId(),
                        member.getTenantId(),
                        member.getAuthUserId(),
                        member.getName(),
                        member.getEmail(),
                        member.getMobile(),
                        member.getMemberRole().name(),
                        member.getActive()
                ))
                .toList();
    }

    public List<SaasMemberPermissionResponse> getMemberPermissions(
            Long tenantId,
            Long authUserId
    ) {
        tenantAccessService.validateOwnerOrAdmin(tenantId);

        return permissionRepository
                .findByTenantIdAndAuthUserIdOrderByModuleAscPermissionActionAsc(tenantId, authUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<SaasMemberPermissionResponse> saveMemberPermissions(
            SaasMemberPermissionRequest request
    ) {
        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getAuthUserId() == null) {
            throw new RuntimeException("authUserId is required");
        }

        tenantAccessService.validateOwnerOrAdmin(request.getTenantId());

        TenantMember targetMember = tenantMemberRepository
                .findByTenantIdAndAuthUserIdAndActiveTrue(request.getTenantId(), request.getAuthUserId())
                .orElseThrow(() -> new RuntimeException("Tenant member not found"));

        if (targetMember.getMemberRole() == TenantMemberRole.OWNER) {
            throw new RuntimeException("Owner permissions cannot be changed");
        }

        permissionRepository.deleteByTenantIdAndAuthUserId(
                request.getTenantId(),
                request.getAuthUserId()
        );
        permissionRepository.flush();
        
        Set<String> uniquePermissions = new HashSet<>();
        
        if (request.getPermissions() != null) {
            for (SaasPermissionItemRequest item : request.getPermissions()) {

                if (item.getModule() == null || item.getPermissionAction() == null) {
                    continue;
                }

                TenantModule module = TenantModule.valueOf(
                        item.getModule().toUpperCase()
                );

                SaasPermissionAction action = SaasPermissionAction.valueOf(
                        item.getPermissionAction().toUpperCase()
                );

                String uniqueKey = module.name() + "_" + action.name();

                if (!uniquePermissions.add(uniqueKey)) {
                    continue;
                }
                
                SaasTenantMemberPermission permission = new SaasTenantMemberPermission();
                permission.setTenantId(request.getTenantId());
                permission.setAuthUserId(request.getAuthUserId());
                permission.setModule(module);
                permission.setPermissionAction(action);
                permission.setAllowed(item.getAllowed() == null || item.getAllowed());
                permission.setGrantedByAuthUserId(CurrentUserUtil.getUserId());

                permissionRepository.save(permission);
            }
        }

        return getMemberPermissions(request.getTenantId(), request.getAuthUserId());
    }
    
    
    public SaasCurrentPermissionResponse getCurrentUserPermissions(Long tenantId) {

        TenantMember member = tenantAccessService.getCurrentTenantMember(tenantId);

        boolean ownerOrAdmin = member.getMemberRole() == TenantMemberRole.OWNER
                || member.getMemberRole() == TenantMemberRole.ADMIN;

        List<SaasMemberPermissionResponse> permissions =
                permissionRepository
                        .findByTenantIdAndAuthUserIdOrderByModuleAscPermissionActionAsc(
                                tenantId,
                                member.getAuthUserId()
                        )
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return new SaasCurrentPermissionResponse(
                tenantId,
                member.getAuthUserId(),
                member.getMemberRole().name(),
                ownerOrAdmin,
                permissions
        );
    }

    public SaasPermissionCheckResponse checkPermission(
            Long tenantId,
            String module,
            String action
    ) {
        boolean allowed = hasPermission(
                tenantId,
                TenantModule.valueOf(module.toUpperCase()),
                SaasPermissionAction.valueOf(action.toUpperCase())
        );

        return new SaasPermissionCheckResponse(allowed);
    }

    public boolean hasPermission(
            Long tenantId,
            TenantModule module,
            SaasPermissionAction action
    ) {
        TenantMember member = tenantAccessService.getCurrentTenantMember(tenantId);

        /*
         * OWNER and ADMIN full access.
         */
        if (member.getMemberRole() == TenantMemberRole.OWNER
                || member.getMemberRole() == TenantMemberRole.ADMIN) {
            return true;
        }

        /*
         * Permission row based access.
         */
        return permissionRepository
                .existsByTenantIdAndAuthUserIdAndModuleAndPermissionActionAndAllowedTrue(
                        tenantId,
                        member.getAuthUserId(),
                        module,
                        action
                );
    }

    public void requirePermission(
            Long tenantId,
            TenantModule module,
            SaasPermissionAction action
    ) {
        if (!hasPermission(tenantId, module, action)) {
            throw new RuntimeException("Permission denied: " + module.name() + " - " + action.name());
        }
    }

    /*
     * Default permissions by role.
     * Is method ko staff/member add karte time use kar sakte hain.
     */
    @Transactional
    public void assignDefaultPermissions(
            Long tenantId,
            Long authUserId,
            TenantMemberRole memberRole
    ) {
        if (tenantId == null || authUserId == null || memberRole == null) {
            return;
        }

        if (memberRole == TenantMemberRole.OWNER || memberRole == TenantMemberRole.ADMIN) {
            return;
        }

        permissionRepository.deleteByTenantIdAndAuthUserId(tenantId, authUserId);

        switch (memberRole) {

            case DOCTOR -> {
                allowAllActions(tenantId, authUserId, TenantModule.PATIENTS);
                allowAllActions(tenantId, authUserId, TenantModule.APPOINTMENTS);
                allowAllActions(tenantId, authUserId, TenantModule.PRESCRIPTIONS);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.OPD);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.IPD);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.LAB);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.RADIOLOGY);
            }

            case RECEPTIONIST -> {
                allowAllActions(tenantId, authUserId, TenantModule.PATIENTS);
                allowAllActions(tenantId, authUserId, TenantModule.APPOINTMENTS);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.OPD);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.IPD);
                allowView(tenantId, authUserId, TenantModule.BILLING);
            }

            case ACCOUNTANT -> {
                allowAllActions(tenantId, authUserId, TenantModule.BILLING);
                allowView(tenantId, authUserId, TenantModule.PATIENTS);
                allowView(tenantId, authUserId, TenantModule.OPD);
                allowView(tenantId, authUserId, TenantModule.IPD);
                allowView(tenantId, authUserId, TenantModule.REPORTS);
            }

            case PHARMACIST -> {
                allowAllActions(tenantId, authUserId, TenantModule.PHARMACY);
                allowAllActions(tenantId, authUserId, TenantModule.INVENTORY);
                allowView(tenantId, authUserId, TenantModule.PATIENTS);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.BILLING);
            }

            case LAB_TECHNICIAN -> {
                allowAllActions(tenantId, authUserId, TenantModule.LAB);
                allowView(tenantId, authUserId, TenantModule.PATIENTS);
                allowViewCreateUpdate(tenantId, authUserId, TenantModule.BILLING);
            }

            case STAFF, MANAGER -> {
                allowView(tenantId, authUserId, TenantModule.DASHBOARD);
                allowView(tenantId, authUserId, TenantModule.PATIENTS);
                allowView(tenantId, authUserId, TenantModule.APPOINTMENTS);
            }

            default -> allowView(tenantId, authUserId, TenantModule.DASHBOARD);
        }
    }

    private void allowAllActions(Long tenantId, Long authUserId, TenantModule module) {
        for (SaasPermissionAction action : SaasPermissionAction.values()) {
            savePermission(tenantId, authUserId, module, action);
        }
    }

    private void allowView(Long tenantId, Long authUserId, TenantModule module) {
        savePermission(tenantId, authUserId, module, SaasPermissionAction.VIEW);
    }

    private void allowViewCreateUpdate(Long tenantId, Long authUserId, TenantModule module) {
        savePermission(tenantId, authUserId, module, SaasPermissionAction.VIEW);
        savePermission(tenantId, authUserId, module, SaasPermissionAction.CREATE);
        savePermission(tenantId, authUserId, module, SaasPermissionAction.UPDATE);
    }

    private void savePermission(
            Long tenantId,
            Long authUserId,
            TenantModule module,
            SaasPermissionAction action
    ) {
        SaasTenantMemberPermission permission = new SaasTenantMemberPermission();
        permission.setTenantId(tenantId);
        permission.setAuthUserId(authUserId);
        permission.setModule(module);
        permission.setPermissionAction(action);
        permission.setAllowed(true);
        permission.setGrantedByAuthUserId(CurrentUserUtil.getUserId());

        permissionRepository.save(permission);
    }

    private SaasMemberPermissionResponse toResponse(SaasTenantMemberPermission permission) {
        return new SaasMemberPermissionResponse(
                permission.getId(),
                permission.getTenantId(),
                permission.getAuthUserId(),
                permission.getModule().name(),
                permission.getPermissionAction().name(),
                permission.getAllowed()
        );
    }
}