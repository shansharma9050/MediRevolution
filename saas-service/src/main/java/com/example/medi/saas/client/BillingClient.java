package com.example.medi.saas.client;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class BillingClient {

	private final RestTemplate restTemplate;

	@Value("${billing.service.url}")
	private String billingServiceUrl;

	@Value("${internal.service.key}")
	private String internalServiceKey;

	public BillingClient(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public void updateWorkspaceSubscriptionValidity(Long tenantId, LocalDate validFrom, LocalDate validUntil) {

		if (tenantId == null || tenantId <= 0) {
			throw new RuntimeException("Workspace id is required");
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

		headers.set(HttpHeaders.CONTENT_TYPE, "application/json");

		String body = "{" + "\"validFrom\":\"" + validFrom + "\"," + "\"validUntil\":\"" + validUntil + "\"" + "}";

		HttpEntity<String> request = new HttpEntity<>(body, headers);

		try {

			restTemplate.exchange(url, HttpMethod.PUT, request, Void.class);

		} catch (RuntimeException ex) {

			throw new RuntimeException("Unable to synchronize workspace validity with billing service", ex);
		}
	}
}