package com.example.medi.saas.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class BillingWorkspaceCleanupClient {

    private final RestTemplate restTemplate;

    @Value("${billing.service.url}")
    private String billingServiceUrl;

    @Value("${internal.service.key}")
    private String internalServiceKey;

    public BillingWorkspaceCleanupClient(
            RestTemplate restTemplate) {

        this.restTemplate = restTemplate;
    }

    public void deleteWorkspaceBillingData(Long tenantId) {

        if (tenantId == null || tenantId <= 0) {
            throw new RuntimeException(
                    "Valid tenant id is required");
        }

        String url =
                billingServiceUrl
                + "/billing/internal/tenants/"
                + tenantId
                + "/workspace-data";

        HttpHeaders headers = new HttpHeaders();

        headers.set(
                "X-Internal-Service-Key",
                internalServiceKey
        );

        headers.setAccept(
                List.of(MediaType.APPLICATION_JSON)
        );

        HttpEntity<Void> request =
                new HttpEntity<>(headers);

        try {

            restTemplate.exchange(
                    url,
                    HttpMethod.DELETE,
                    request,
                    Void.class
            );

        } catch (Exception ex) {

            throw new RuntimeException(
                    "Unable to delete workspace billing data",
                    ex
            );
        }
    }
}