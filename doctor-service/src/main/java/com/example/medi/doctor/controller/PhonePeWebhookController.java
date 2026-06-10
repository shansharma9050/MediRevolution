package com.example.medi.doctor.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.medi.doctor.service.AppointmentPaymentService;

@RestController
@RequestMapping("/webhooks/phonepe")
public class PhonePeWebhookController {

    private final AppointmentPaymentService appointmentPaymentService;

    public PhonePeWebhookController(AppointmentPaymentService appointmentPaymentService) {
        this.appointmentPaymentService = appointmentPaymentService;
    }

    @PostMapping
    public ResponseEntity<?> handleWebhook(@RequestBody Map<String, Object> payload,
                                           @RequestHeader Map<String, String> headers) {

        /*
         * IMPORTANT:
         * Check actual PhonePe webhook payload in sandbox.
         * Then map merchantOrderId/status/transactionId correctly.
         */

        String merchantOrderId = extractString(payload, "merchantOrderId");
        String state = extractString(payload, "state");
        String transactionId = extractString(payload, "transactionId");

        if (merchantOrderId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "merchantOrderId missing"));
        }

        if ("COMPLETED".equalsIgnoreCase(state) || "SUCCESS".equalsIgnoreCase(state)) {
            appointmentPaymentService.markPaymentSuccess(merchantOrderId, transactionId);
        } else if ("FAILED".equalsIgnoreCase(state)) {
            appointmentPaymentService.markPaymentFailed(merchantOrderId);
        }

        return ResponseEntity.ok(Map.of("message", "Webhook processed"));
    }

    private String extractString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : value.toString();
    }
}