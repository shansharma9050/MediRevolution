package com.example.medi.doctor.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.medi.doctor.dto.BookVideoAppointmentRequest;
import com.example.medi.doctor.dto.PaymentStartResponse;
import com.example.medi.doctor.service.AppointmentPaymentService;

@RestController
@RequestMapping("/doctor/payments")
public class AppointmentPaymentController {

    private final AppointmentPaymentService appointmentPaymentService;

    public AppointmentPaymentController(AppointmentPaymentService appointmentPaymentService) {
        this.appointmentPaymentService = appointmentPaymentService;
    }

    @PostMapping("/video-appointment")
    public ResponseEntity<?> bookVideoAppointmentAndPay(
            @RequestBody BookVideoAppointmentRequest request) {
        try {
            PaymentStartResponse response =
                    appointmentPaymentService.bookVideoAppointmentAndStartPayment(request);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    /*
     * Temporary redirect success handler.
     * Final confirmation should come from webhook/status verify.
     */
    @GetMapping("/success")
    public ResponseEntity<?> paymentSuccess(@RequestParam String merchantOrderId,
                                            @RequestParam Long appointmentId) {
        return ResponseEntity.ok(
                Map.of(
                        "message", "Payment redirect received",
                        "appointmentId", appointmentId,
                        "merchantOrderId", merchantOrderId
                )
        );
    }
}