package com.example.medi.billing.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.medi.billing.service.BillingWorkspaceCleanupService;

@RestController
@RequestMapping("/billing/internal")
public class BillingWorkspaceInternalController {

    private final BillingWorkspaceCleanupService billingWorkspaceCleanupService;

    @Value("${internal.service.key}")
    private String internalServiceKey;

    public BillingWorkspaceInternalController(
            BillingWorkspaceCleanupService billingWorkspaceCleanupService) {

        this.billingWorkspaceCleanupService =
                billingWorkspaceCleanupService;
    }

    @DeleteMapping("/tenants/{tenantId}/workspace-data")
    public void deleteWorkspaceBillingData(
            @PathVariable Long tenantId,
            @RequestHeader(
                    value = "X-Internal-Service-Key",
                    required = false
            ) String serviceKey) {

        validateInternalKey(serviceKey);

        billingWorkspaceCleanupService.deleteWorkspaceBillingData(
                tenantId
        );
    }

    private void validateInternalKey(String serviceKey) {

        if (serviceKey == null || serviceKey.isBlank()) {

            throw new RuntimeException(
                    "Internal service key missing"
            );
        }

        if (!internalServiceKey.equals(serviceKey)) {

            throw new RuntimeException(
                    "Invalid internal service key"
            );
        }
    }
}