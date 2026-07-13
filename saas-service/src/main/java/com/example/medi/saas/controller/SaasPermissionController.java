package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasPermissionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/permissions")
public class SaasPermissionController {

    private final SaasPermissionService permissionService;

    public SaasPermissionController(SaasPermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/members")
    public List<SaasTenantMemberWithPermissionResponse> getTenantMembers(
            @RequestParam Long tenantId
    ) {
        return permissionService.getTenantMembers(tenantId);
    }

    @GetMapping("/member")
    public List<SaasMemberPermissionResponse> getMemberPermissions(
            @RequestParam Long tenantId,
            @RequestParam Long authUserId
    ) {
        return permissionService.getMemberPermissions(tenantId, authUserId);
    }

    @PutMapping("/member")
    public List<SaasMemberPermissionResponse> saveMemberPermissions(
            @RequestBody SaasMemberPermissionRequest request
    ) {
        return permissionService.saveMemberPermissions(request);
    }

    @GetMapping("/check")
    public SaasPermissionCheckResponse checkPermission(
            @RequestParam Long tenantId,
            @RequestParam String module,
            @RequestParam String action
    ) {
        return permissionService.checkPermission(tenantId, module, action);
    }
    
    @GetMapping("/current")
    public SaasCurrentPermissionResponse getCurrentUserPermissions(
            @RequestParam Long tenantId
    ) {
        return permissionService.getCurrentUserPermissions(tenantId);
    }
}