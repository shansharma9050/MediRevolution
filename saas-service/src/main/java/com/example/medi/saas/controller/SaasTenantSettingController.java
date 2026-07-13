package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasTenantSettingRequest;
import com.example.medi.saas.dto.SaasTenantSettingResponse;
import com.example.medi.saas.service.SaasTenantSettingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/saas/settings")
public class SaasTenantSettingController {

    private final SaasTenantSettingService settingService;

    public SaasTenantSettingController(SaasTenantSettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping
    public SaasTenantSettingResponse getSettings(@RequestParam Long tenantId) {
        return settingService.getSettings(tenantId);
    }

    @PutMapping
    public SaasTenantSettingResponse saveSettings(@RequestBody SaasTenantSettingRequest request) {
        return settingService.saveSettings(request);
    }
}