package com.example.medi.billing.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PhonePeSubscriptionService {

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

	public PhonePeSubscriptionService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	/*
	 * ============================================================ 1. GET PHONEPE
	 * ACCESS TOKEN ============================================================
	 */

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

			if (accessToken == null || accessToken.toString().isBlank()) {

				throw new RuntimeException("PhonePe access_token not found");
			}

			return accessToken.toString();

		} catch (HttpClientErrorException e) {

			System.out.println("PhonePe OAuth Status: " + e.getStatusCode());

			System.out.println("PhonePe OAuth Response: " + e.getResponseBodyAsString());

			throw new RuntimeException("PhonePe OAuth failed");
		}
	}

	/*
	 * ============================================================ 2. CREATE
	 * PHONEPE CHECKOUT PAYMENT
	 * ============================================================
	 */

	public String createCheckoutPayment(String merchantOrderId, long amountInPaise, Long paymentId) {

		if (merchantOrderId == null || merchantOrderId.isBlank()) {

			throw new RuntimeException("Merchant order id is required");
		}

		if (amountInPaise <= 0) {

			throw new RuntimeException("Payment amount must be greater than zero");
		}

		if (paymentId == null) {

			throw new RuntimeException("Payment id is required");
		}

		/*
		 * -------------------------------------------------------- GET ACCESS TOKEN
		 * --------------------------------------------------------
		 */

		String token = getAccessToken();

		/*
		 * -------------------------------------------------------- PHONEPE CHECKOUT URL
		 * --------------------------------------------------------
		 */

		String url = baseUrl + "/checkout/v2/pay";

		/*
		 * -------------------------------------------------------- HEADERS
		 * --------------------------------------------------------
		 */

		HttpHeaders headers = new HttpHeaders();

		headers.setContentType(MediaType.APPLICATION_JSON);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		/*
		 * PhonePe Checkout API requires O-Bearer.
		 */
		headers.set("Authorization", "O-Bearer " + token);

		/*
		 * -------------------------------------------------------- SUCCESS REDIRECT URL
		 * --------------------------------------------------------
		 *
		 * We send paymentId + merchantOrderId so that our frontend can call backend
		 * verification.
		 *
		 */

		String finalRedirectUrl = UriComponentsBuilder.fromUriString(redirectUrl)
				.queryParam("paymentFor", "SUBSCRIPTION").queryParam("paymentId", paymentId)
				.queryParam("merchantOrderId", merchantOrderId).toUriString();

		/*
		 * -------------------------------------------------------- PAYMENT FLOW
		 * --------------------------------------------------------
		 */

		Map<String, Object> paymentFlow = Map.of("type", "PG_CHECKOUT",

				"merchantUrls", Map.of("redirectUrl", finalRedirectUrl));

		/*
		 * -------------------------------------------------------- REQUEST BODY
		 * --------------------------------------------------------
		 */

		Map<String, Object> body = Map.of("merchantOrderId", merchantOrderId,

				"amount", amountInPaise,

				"expireAfter", 1200,

				"paymentFlow", paymentFlow);

		HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

		/*
		 * -------------------------------------------------------- CALL PHONEPE
		 * --------------------------------------------------------
		 */

		try {

			ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

			if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {

				throw new RuntimeException("Unable to create PhonePe subscription payment");
			}

			Map responseBody = response.getBody();

			/*
			 * ---------------------------------------------------- EXTRACT REDIRECT URL
			 * ----------------------------------------------------
			 *
			 * Different PhonePe responses can expose the URL differently, so we support the
			 * common structures.
			 *
			 */

			Object redirectUrlObject = responseBody.get("redirectUrl");

			if (redirectUrlObject == null && responseBody.get("data") instanceof Map<?, ?> data) {

				redirectUrlObject = data.get("redirectUrl");
			}

			if (redirectUrlObject == null && responseBody.get("redirectInfo") instanceof Map<?, ?> redirectInfo) {

				redirectUrlObject = redirectInfo.get("url");
			}

			if (redirectUrlObject == null || redirectUrlObject.toString().isBlank()) {

				System.out.println("PhonePe Pay Response: " + responseBody);

				throw new RuntimeException("PhonePe redirect URL not found");
			}

			return redirectUrlObject.toString();

		} catch (HttpClientErrorException e) {

			System.out.println("PhonePe Pay Status: " + e.getStatusCode());

			System.out.println("PhonePe Pay Response: " + e.getResponseBodyAsString());

			throw new RuntimeException("PhonePe subscription payment initiation failed");
		}
	}

	/*
	 * ============================================================ 3. CHECK PHONEPE
	 * PAYMENT STATUS ============================================================
	 */

	public PhonePePaymentStatus checkPaymentStatus(String merchantOrderId) {

		if (merchantOrderId == null || merchantOrderId.isBlank()) {

			throw new RuntimeException("Merchant order id is required");
		}

		/*
		 * -------------------------------------------------------- GET TOKEN
		 * --------------------------------------------------------
		 */

		String token = getAccessToken();

		/*
		 * -------------------------------------------------------- PHONEPE STATUS URL
		 * --------------------------------------------------------
		 */

		String url = baseUrl + "/checkout/v2/order/" + merchantOrderId + "/status";

		/*
		 * -------------------------------------------------------- HEADERS
		 * --------------------------------------------------------
		 */

		HttpHeaders headers = new HttpHeaders();

		headers.set("Authorization", "O-Bearer " + token);

		headers.setAccept(List.of(MediaType.APPLICATION_JSON));

		HttpEntity<Void> request = new HttpEntity<>(headers);

		try {

			ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

			if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {

				throw new RuntimeException("Unable to check PhonePe payment status");
			}

			Map responseBody = response.getBody();

			System.out.println("PhonePe Status Response: " + responseBody);

			/*
			 * ---------------------------------------------------- EXTRACT STATE
			 * ----------------------------------------------------
			 */

			String state = extractString(responseBody, "state");

			if (state == null) {

				state = extractString(responseBody, "status");
			}

			if (state == null) {

				state = "UNKNOWN";
			}

			/*
			 * ---------------------------------------------------- EXTRACT TRANSACTION ID
			 * ----------------------------------------------------
			 */

			String transactionId = extractTransactionId(responseBody);

			return new PhonePePaymentStatus(state, transactionId, responseBody);

		} catch (HttpClientErrorException e) {

			System.out.println("PhonePe Status API Status: " + e.getStatusCode());

			System.out.println("PhonePe Status API Response: " + e.getResponseBodyAsString());

			throw new RuntimeException("PhonePe subscription payment status check failed");
		}
	}

	/*
	 * ============================================================ 4. EXTRACT
	 * SIMPLE STRING ============================================================
	 */

	private String extractString(Map<?, ?> response, String key) {

		Object value = response.get(key);

		if (value != null) {
			return value.toString();
		}

		Object data = response.get("data");

		if (data instanceof Map<?, ?> dataMap) {

			value = dataMap.get(key);

			if (value != null) {
				return value.toString();
			}
		}

		return null;
	}

	/*
	 * ============================================================ 5. EXTRACT
	 * TRANSACTION ID ============================================================
	 */

	private String extractTransactionId(Map<?, ?> response) {

		/*
		 * First try common top-level fields.
		 */

		String transactionId = firstNonBlank(extractString(response, "transactionId"),

				extractString(response, "transactionReferenceId"),

				extractString(response, "providerReferenceId"));

		if (transactionId != null) {
			return transactionId;
		}

		/*
		 * Then inspect data.
		 */

		Object data = response.get("data");

		if (data instanceof Map<?, ?> dataMap) {

			transactionId = firstNonBlank(valueAsString(dataMap, "transactionId"),

					valueAsString(dataMap, "transactionReferenceId"),

					valueAsString(dataMap, "providerReferenceId"));

			if (transactionId != null) {
				return transactionId;
			}

			/*
			 * Some responses contain payment details.
			 */

			Object paymentDetails = dataMap.get("paymentDetails");

			if (paymentDetails instanceof List<?> list) {

				for (Object item : list) {

					if (item instanceof Map<?, ?> paymentMap) {

						transactionId = firstNonBlank(valueAsString(paymentMap, "transactionId"),

								valueAsString(paymentMap, "transactionReferenceId"),

								valueAsString(paymentMap, "providerReferenceId"));

						if (transactionId != null) {
							return transactionId;
						}
					}
				}
			}
		}

		return null;
	}

	private String valueAsString(Map<?, ?> map, String key) {

		Object value = map.get(key);

		return value == null ? null : value.toString();
	}

	private String firstNonBlank(String... values) {

		for (String value : values) {

			if (value != null && !value.isBlank()) {

				return value;
			}
		}

		return null;
	}
}