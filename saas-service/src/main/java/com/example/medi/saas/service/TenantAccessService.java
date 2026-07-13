package com.example.medi.saas.service;

import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.repository.TenantRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;

@Service
public class TenantAccessService {

    private final TenantRepository tenantRepository;
    private final TenantMemberRepository tenantMemberRepository;

    public TenantAccessService(
            TenantRepository tenantRepository,
            TenantMemberRepository tenantMemberRepository
    ) {
        this.tenantRepository = tenantRepository;
        this.tenantMemberRepository = tenantMemberRepository;
    }

    public Tenant validateTenantAccess(Long tenantId) {

        if (tenantId == null) {
            throw new RuntimeException("tenantId is required");
        }

        Long currentUserId = CurrentUserUtil.getUserId();

        if (currentUserId == null) {
            throw new RuntimeException("User not found from token");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        tenantMemberRepository
                .findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, currentUserId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

        return tenant;
    }

    public TenantMember getCurrentTenantMember(Long tenantId) {

        Long currentUserId = CurrentUserUtil.getUserId();

        if (currentUserId == null) {
            throw new RuntimeException("User not found from token");
        }

        return tenantMemberRepository
                .findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, currentUserId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));
    }

    public void validateOwnerOrAdmin(Long tenantId) {

        Tenant tenant = validateTenantAccess(tenantId);

        Long currentUserId = CurrentUserUtil.getUserId();

        if (tenant.getOwnerAuthUserId().equals(currentUserId)) {
            return;
        }

        TenantMember member = getCurrentTenantMember(tenantId);

        if (!"ADMIN".equals(member.getMemberRole().name())
                && !"MANAGER".equals(member.getMemberRole().name())
                && !"RECEPTIONIST".equals(member.getMemberRole().name())) {
            throw new RuntimeException("You do not have permission for this action");
        }
    }
    
    public boolean isOwnerOrAdmin(Long tenantId) {

        TenantMember member = getCurrentTenantMember(tenantId);

        return member.getMemberRole() == TenantMemberRole.OWNER
                || member.getMemberRole() == TenantMemberRole.ADMIN;
    }

    public Tenant getTenant(Long tenantId) {
        return tenantRepository
                .findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
    }
}