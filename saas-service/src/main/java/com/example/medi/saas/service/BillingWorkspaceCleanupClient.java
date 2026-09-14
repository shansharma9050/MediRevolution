package com.example.medi.saas.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.medi.saas.dto.WorkspaceValidityUpdateRequest;

@Service
public class BillingWorkspaceCleanupClient {

	private final RestTemplate restTemplate;

	@Value("${billing.service.url}")
	private String billingServiceUrl;

	@Value("${internal.service.key}")
	private String internalServiceKey;

	public BillingWorkspaceCleanupClient(RestTemplate restTemplate) {

		this.restTemplate = restTemplate;
	}

	// ============================================================
	// DELETE WORKSPACE BILLING DATA
	// ============================================================

	public void deleteWorkspaceBillingData(Long tenantId) {

		if (tenantId == null || tenantId <= 0) {
			throw new RuntimeException("Valid tenant id is required");
		}

		String url = billingServiceUrl + "/billing/internal/tenants/" + tenantId + "/workspace-data";

		HttpHeaders headers = new HttpHeaders();

		headers.set("X-Internal-Service-Key", internalServiceKey);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		HttpEntity<Void> request = new HttpEntity<>(headers);

		try {

			restTemplate.exchange(url, HttpMethod.DELETE, request, Void.class);

		} catch (Exception ex) {

			throw new RuntimeException("Unable to delete workspace billing data", ex);
		}
	}

	// ============================================================
	// UPDATE WORKSPACE SUBSCRIPTION VALIDITY
	// ============================================================

	public void updateWorkspaceSubscriptionValidity(Long tenantId, LocalDate validFrom, LocalDate validUntil) {

		if (tenantId == null || tenantId <= 0) {
			throw new RuntimeException("Valid tenant id is required");
		}

		if (validFrom == null) {
			throw new RuntimeException("Valid from date is required");
		}

		if (validUntil == null) {
			throw new RuntimeException("Valid until date is required");
		}

		if (validUntil.isBefore(validFrom)) {
			throw new RuntimeException("Valid until date cannot be before valid from date");
		}

		String url = billingServiceUrl + "/billing/internal/tenants/" + tenantId + "/subscription/validity";

		HttpHeaders headers = new HttpHeaders();

		headers.set("X-Internal-Service-Key", internalServiceKey);

		headers.setContentType(MediaType.APPLICATION_JSON);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		WorkspaceValidityUpdateRequest requestBody = new WorkspaceValidityUpdateRequest();

		requestBody.setValidFrom(validFrom);
		requestBody.setValidUntil(validUntil);

		HttpEntity<WorkspaceValidityUpdateRequest> request = new HttpEntity<>(requestBody, headers);

		try {

			restTemplate.exchange(url, HttpMethod.PUT, request, Void.class);

		} catch (Exception ex) {

			throw new RuntimeException("Unable to update workspace subscription validity", ex);
		}
	}
}