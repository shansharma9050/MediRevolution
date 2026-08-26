package com.example.medi.saas.controller;

import com.example.medi.saas.service.SaasAppointmentPaymentService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/webhooks/phonepe/saas-appointment")
public class SaasAppointmentPhonePeWebhookController {

	private final SaasAppointmentPaymentService paymentService;

	public SaasAppointmentPhonePeWebhookController(SaasAppointmentPaymentService paymentService) {

		this.paymentService = paymentService;
	}

	@PostMapping
	public ResponseEntity<?> handleWebhook(@RequestBody Map<String, Object> payload) {

		String merchantOrderId = extract(payload, "merchantOrderId");

		String state = extract(payload, "state");

		String transactionId = extract(payload, "transactionId");

		if (merchantOrderId == null) {

			return ResponseEntity.badRequest().body(Map.of("message", "merchantOrderId missing"));
		}

		if ("COMPLETED".equalsIgnoreCase(state) || "SUCCESS".equalsIgnoreCase(state)) {

			paymentService.markPaymentSuccess(merchantOrderId, transactionId);

		} else if ("FAILED".equalsIgnoreCase(state)) {

			paymentService.markPaymentFailed(merchantOrderId);
		}

		return ResponseEntity.ok(Map.of("message", "SaaS appointment webhook processed"));
	}

	private String extract(Map<String, Object> payload, String key) {

		Object value = payload.get(key);

		return value == null ? null : value.toString();
	}
}