package com.example.medi.billing.controller;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.medi.billing.dto.WorkspaceValidityUpdateRequest;
import com.example.medi.billing.service.BillingWorkspaceCleanupService;
import com.example.medi.billing.service.SubscriptionService;

@RestController
@RequestMapping("/billing/internal")
public class BillingWorkspaceInternalController {

	private final BillingWorkspaceCleanupService billingWorkspaceCleanupService;

	private final SubscriptionService subscriptionService;

	@Value("${internal.service.key}")
	private String internalServiceKey;

	public BillingWorkspaceInternalController(BillingWorkspaceCleanupService billingWorkspaceCleanupService,
			SubscriptionService subscriptionService) {

		this.billingWorkspaceCleanupService = billingWorkspaceCleanupService;

		this.subscriptionService = subscriptionService;
	}

	// ============================================================
	// DELETE WORKSPACE BILLING DATA
	// ============================================================

	@DeleteMapping("/tenants/{tenantId}/workspace-data")
	public void deleteWorkspaceBillingData(@PathVariable Long tenantId,
			@RequestHeader(value = "X-Internal-Service-Key", required = false) String serviceKey) {

		validateInternalKey(serviceKey);

		billingWorkspaceCleanupService.deleteWorkspaceBillingData(tenantId);
	}

	// ============================================================
	// UPDATE WORKSPACE SUBSCRIPTION VALIDITY
	// ============================================================

	@PutMapping("/tenants/{tenantId}/subscription/validity")
	public void updateWorkspaceSubscriptionValidity(@PathVariable Long tenantId,
			@RequestBody WorkspaceValidityUpdateRequest request,
			@RequestHeader(value = "X-Internal-Service-Key", required = false) String serviceKey) {

		validateInternalKey(serviceKey);

		if (tenantId == null || tenantId <= 0) {
			throw new RuntimeException("Workspace id is required");
		}

		if (request == null) {
			throw new RuntimeException("Workspace validity request is required");
		}

		LocalDate validFrom = request.getValidFrom();
		LocalDate validUntil = request.getValidUntil();

		if (validFrom == null) {
			throw new RuntimeException("Valid from date is required");
		}

		if (validUntil == null) {
			throw new RuntimeException("Valid until date is required");
		}

		if (validUntil.isBefore(validFrom)) {
			throw new RuntimeException("Valid until date cannot be before valid from date");
		}

		subscriptionService.updateWorkspaceSubscriptionValidity(tenantId, validFrom, validUntil);
	}

	// ============================================================
	// INTERNAL KEY
	// ============================================================

	private void validateInternalKey(String serviceKey) {

		if (serviceKey == null || serviceKey.isBlank()) {

			throw new RuntimeException("Internal service key missing");
		}

		if (!internalServiceKey.equals(serviceKey)) {

			throw new RuntimeException("Invalid internal service key");
		}
	}
}