package com.example.medi.saas.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.medi.saas.dto.SaasPhonePayPaymentStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SaasPhonePeService {

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

	public SaasPhonePeService(RestTemplate restTemplate) {

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

				throw new RuntimeException("Unable to get PhonePe access token.");
			}

			Object token = response.getBody().get("access_token");

			if (token == null) {

				throw new RuntimeException("PhonePe access token not found.");
			}

			return token.toString();

		} catch (HttpClientErrorException e) {

			throw new RuntimeException("PhonePe OAuth failed.");
		}
	}

	public String createCheckoutPayment(String merchantOrderId, Long amountInPaise, Long appointmentId) {

		String token = getAccessToken();

		String url = baseUrl + "/checkout/v2/pay";

		HttpHeaders headers = new HttpHeaders();

		headers.setContentType(MediaType.APPLICATION_JSON);

		headers.set("Authorization", "O-Bearer " + token);

		String finalRedirectUrl = UriComponentsBuilder.fromUriString(redirectUrl)
				.queryParam("paymentFor", "SAAS_APPOINTMENT").queryParam("appointmentId", appointmentId)
				.queryParam("merchantOrderId", merchantOrderId).toUriString();

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

			throw new RuntimeException("Unable to create PhonePe payment.");
		}

		Map responseBody = response.getBody();

		Object redirect = responseBody.get("redirectUrl");

		if (redirect == null && responseBody.get("data") instanceof Map data) {

			redirect = data.get("redirectUrl");
		}

		if (redirect == null) {

			throw new RuntimeException("PhonePe redirect URL not found.");
		}

		return redirect.toString();
	}

	public SaasPhonePayPaymentStatus checkPaymentStatus(String merchantOrderId) {

		if (merchantOrderId == null || merchantOrderId.isBlank()) {
			throw new RuntimeException("Merchant order ID is required.");
		}

		String accessToken = getAccessToken();

		String url = baseUrl + "/checkout/v2/order/" + merchantOrderId + "/status";

		HttpHeaders headers = new HttpHeaders();

		headers.set("Authorization", "O-Bearer " + accessToken);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		HttpEntity<Void> request = new HttpEntity<>(headers);

		try {

			ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

			if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {

				throw new RuntimeException("Unable to verify PhonePe payment.");
			}

			Map body = response.getBody();

			String state = extractPaymentState(body);

			String transactionId = extractTransactionId(body);

			return new SaasPhonePayPaymentStatus(state, transactionId, body.toString());

		} catch (HttpClientErrorException e) {

			System.err.println("PhonePe payment verification status: " + e.getStatusCode());

			System.err.println("PhonePe payment verification response: " + e.getResponseBodyAsString());

			throw new RuntimeException("Unable to verify PhonePe payment.");
		}
	}

	private String extractPaymentState(Map body) {

		if (body == null) {
			return null;
		}

		Object state = body.get("state");

		if (state != null) {
			return state.toString();
		}

		Object status = body.get("status");

		if (status != null) {
			return status.toString();
		}

		Object data = body.get("data");

		if (data instanceof Map dataMap) {

			Object nestedState = dataMap.get("state");

			if (nestedState != null) {
				return nestedState.toString();
			}

			Object nestedStatus = dataMap.get("status");

			if (nestedStatus != null) {
				return nestedStatus.toString();
			}
		}

		return null;
	}

	private String extractTransactionId(Map body) {

		if (body == null) {
			return null;
		}

		Object value = body.get("transactionId");

		if (value != null) {
			return value.toString();
		}

		Object data = body.get("data");

		if (data instanceof Map dataMap) {

			Object transactionId = dataMap.get("transactionId");

			if (transactionId != null) {
				return transactionId.toString();
			}

			Object transactionReferenceId = dataMap.get("transactionReferenceId");

			if (transactionReferenceId != null) {
				return transactionReferenceId.toString();
			}

			Object providerReferenceId = dataMap.get("providerReferenceId");

			if (providerReferenceId != null) {
				return providerReferenceId.toString();
			}
		}

		return null;
	}
}