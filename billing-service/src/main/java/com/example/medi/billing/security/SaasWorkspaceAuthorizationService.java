package com.example.medi.billing.security;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.medi.billing.dto.WorkspaceAccessResponse;

@Service
public class SaasWorkspaceAuthorizationService {

	private final RestTemplate restTemplate;

	@Value("${saas.service.url}")
	private String saasServiceUrl;

	@Value("${internal.service.key}")
	private String internalServiceKey;

	public SaasWorkspaceAuthorizationService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public void validateWorkspaceAccess(Long tenantId, Long authUserId) {

		if (tenantId == null || tenantId <= 0) {

			throw new RuntimeException("SaaS workspace is required");
		}

		if (authUserId == null) {

			throw new RuntimeException("User not authenticated");
		}

		String url = saasServiceUrl + "/saas/tenants/" + tenantId + "/access?authUserId=" + authUserId;

		HttpHeaders headers = new HttpHeaders();

		headers.set("X-Internal-Service-Key", internalServiceKey);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		HttpEntity<Void> request = new HttpEntity<>(headers);

		try {

			ResponseEntity<WorkspaceAccessResponse> response = restTemplate.exchange(url, HttpMethod.GET, request,
					WorkspaceAccessResponse.class);

			if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {

				throw new RuntimeException("Unable to validate SaaS workspace access");
			}

			WorkspaceAccessResponse result = response.getBody();

			if (!result.isAllowed()) {

				throw new RuntimeException("You are not authorized to access this SaaS workspace");
			}

		} catch (RuntimeException ex) {

			throw ex;

		} catch (Exception ex) {

			throw new RuntimeException("SaaS workspace service is unavailable");
		}
	}

	public void activateWorkspace(Long tenantId, Long authUserId) {

		if (tenantId == null || tenantId <= 0) {
			throw new RuntimeException("SaaS workspace is required");
		}

		if (authUserId == null) {
			throw new RuntimeException("User not authenticated");
		}

		String url = saasServiceUrl + "/saas/internal/tenants/" + tenantId + "/subscription/activate" + "?authUserId="
				+ authUserId;

		HttpHeaders headers = new HttpHeaders();

		headers.set("X-Internal-Service-Key", internalServiceKey);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		HttpEntity<Void> request = new HttpEntity<>(headers);

		try {

			ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

			if (!response.getStatusCode().is2xxSuccessful()) {

				throw new RuntimeException("Unable to activate SaaS workspace");
			}

		} catch (RuntimeException ex) {

			throw ex;

		} catch (Exception ex) {

			throw new RuntimeException("SaaS workspace service is unavailable");
		}
	}

	public void suspendWorkspace(Long tenantId) {

		if (tenantId == null || tenantId <= 0) {
			return;
		}

		String url = saasServiceUrl + "/saas/internal/tenants/" + tenantId + "/subscription/suspend";

		HttpHeaders headers = new HttpHeaders();

		headers.set("X-Internal-Service-Key", internalServiceKey);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		HttpEntity<Void> request = new HttpEntity<>(headers);

		try {

			ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

			if (!response.getStatusCode().is2xxSuccessful()) {

				throw new RuntimeException("Unable to suspend SaaS workspace");
			}

		} catch (RuntimeException ex) {

			throw ex;

		} catch (Exception ex) {

			throw new RuntimeException("SaaS workspace service is unavailable");
		}
	}
}