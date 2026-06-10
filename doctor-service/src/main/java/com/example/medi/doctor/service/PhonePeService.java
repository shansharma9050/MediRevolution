package com.example.medi.doctor.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PhonePeService {

	private final RestTemplate restTemplate;

	@Value("${phonepe.base-url}")
	private String baseUrl;

	@Value("${phonepe.client-id}")
	private String clientId;

	@Value("${phonepe.client-secret}")
	private String clientSecret;

	@Value("${phonepe.client-version}")
	private String clientVersion;

	@Value("${app.payment.redirect-url}")
	private String redirectUrl;

	public PhonePeService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public String getAccessToken() {

		String url = baseUrl + "/v1/oauth/token";

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
		body.add("client_id", clientId);
		body.add("client_version", clientVersion);
		body.add("client_secret", clientSecret);
		body.add("grant_type", "client_credentials");

		HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

		try {
			ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

			if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
				throw new RuntimeException("Unable to get PhonePe access token");
			}

			Object accessToken = response.getBody().get("access_token");

			if (accessToken == null) {
				throw new RuntimeException("PhonePe access_token not found");
			}

			return accessToken.toString();

		} catch (HttpClientErrorException e) {
			System.out.println("PhonePe OAuth Status: " + e.getStatusCode());
			System.out.println("PhonePe OAuth Response: " + e.getResponseBodyAsString());

			throw new RuntimeException(
					"PhonePe OAuth failed. Please check client_id, client_secret, client_version and sandbox URL.");
		}
	}

	public String createCheckoutPayment(String merchantOrderId, Long amountInPaise, Long appointmentId) {

		String token = getAccessToken();

		String url = baseUrl + "/checkout/v2/pay";

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.set("Authorization", "O-Bearer " + token);

		String finalRedirectUrl = UriComponentsBuilder.fromUriString(redirectUrl)
				.queryParam("appointmentId", appointmentId).queryParam("merchantOrderId", merchantOrderId)
				.toUriString();

		Map<String, Object> paymentFlow = new HashMap<>();
		paymentFlow.put("type", "PG_CHECKOUT");
		paymentFlow.put("merchantUrls", Map.of("redirectUrl", finalRedirectUrl));

		Map<String, Object> body = new HashMap<>();
		body.put("merchantOrderId", merchantOrderId);
		body.put("amount", amountInPaise);
		body.put("expireAfter", 1200);
		body.put("paymentFlow", paymentFlow);

		HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

		ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

		if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
			throw new RuntimeException("Unable to create PhonePe payment");
		}

		Map responseBody = response.getBody();

		/*
		 * PhonePe response may contain redirectUrl depending on API version. Check
		 * actual sandbox response once.
		 */
		Object redirectUrlObj = responseBody.get("redirectUrl");

		if (redirectUrlObj == null && responseBody.get("data") instanceof Map data) {
			redirectUrlObj = data.get("redirectUrl");
		}

		if (redirectUrlObj == null) {
			throw new RuntimeException("PhonePe redirect URL not found in response");
		}

		return redirectUrlObj.toString();
	}
}