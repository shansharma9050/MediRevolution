package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasAppointmentRequest;
import com.example.medi.saas.dto.SaasAppointmentResponse;
import com.example.medi.saas.service.SaasAppointmentLifecycleService;
import com.example.medi.saas.service.SaasAppointmentPaymentService;
import com.example.medi.saas.service.SaasAppointmentService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/saas/appointments")
public class SaasAppointmentController {

	private final SaasAppointmentService appointmentService;

	private final SaasAppointmentPaymentService paymentService;

	private final SaasAppointmentLifecycleService lifecycleService;

	public SaasAppointmentController(SaasAppointmentService appointmentService,
			SaasAppointmentPaymentService paymentService, SaasAppointmentLifecycleService lifecycleService) {

		this.appointmentService = appointmentService;

		this.paymentService = paymentService;

		this.lifecycleService = lifecycleService;
	}

	/*
	 * ================================================================ CREATE
	 * OFFLINE / WORKSPACE APPOINTMENT
	 * ================================================================
	 */

	@PostMapping
	public SaasAppointmentResponse createAppointment(@RequestBody SaasAppointmentRequest request) {

		return appointmentService.createAppointment(request);
	}

	/*
	 * ================================================================ ONLINE
	 * APPOINTMENT + PHONEPE
	 * ================================================================
	 */

	@PostMapping("/online-payment")
	public ResponseEntity<?> startOnlinePayment(@RequestBody SaasAppointmentRequest request) {

		try {

			return ResponseEntity.ok(paymentService.bookOnlineAppointmentAndStartPayment(request));

		} catch (RuntimeException exception) {

			return ResponseEntity.badRequest()
					.body(Map.of("message", safeMessage(exception, "Unable to start appointment payment.")));
		}
	}

	/*
	 * ================================================================ WORKSPACE
	 * APPOINTMENT REGISTER
	 * ================================================================
	 */

	@GetMapping
	public List<SaasAppointmentResponse> getAppointments(@RequestParam Long tenantId) {

		return appointmentService.getAppointments(tenantId);
	}

	/*
	 * ================================================================ PATIENT
	 * APPOINTMENTS ================================================================
	 */

	@GetMapping("/patient")
	public List<SaasAppointmentResponse> getMyPatientAppointments(@RequestParam Long tenantId) {

		return appointmentService.getMyPatientAppointments(tenantId);
	}

	/*
	 * ================================================================ SINGLE
	 * APPOINTMENT ================================================================
	 */

	@GetMapping("/{appointmentId}")
	public SaasAppointmentResponse getAppointment(@PathVariable Long appointmentId, @RequestParam Long tenantId) {

		return appointmentService.getAppointment(tenantId, appointmentId);
	}

	/*
	 * ================================================================ DOCTOR
	 * APPOINTMENTS ================================================================
	 */

	@GetMapping("/doctor")
	public List<SaasAppointmentResponse> getDoctorAppointments(@RequestParam Long tenantId,
			@RequestParam Long doctorAuthUserId) {

		return appointmentService.getDoctorAppointments(tenantId, doctorAuthUserId);
	}

	/*
	 * ================================================================ UPDATE
	 * APPOINTMENT DETAILS
	 * ================================================================
	 */

	@PutMapping("/{appointmentId}")
	public SaasAppointmentResponse updateAppointment(@PathVariable Long appointmentId, @RequestParam Long tenantId,
			@RequestBody SaasAppointmentRequest request) {

		return appointmentService.updateAppointment(tenantId, appointmentId, request);
	}

	/*
	 * ================================================================ CONTROLLED
	 * STATUS TRANSITION
	 * ================================================================
	 */

	@PutMapping("/{appointmentId}/status")
	public SaasAppointmentResponse updateStatus(@PathVariable Long appointmentId, @RequestParam Long tenantId,
			@RequestParam String status) {

		return lifecycleService.updateStatus(tenantId, appointmentId, status);
	}

	/*
	 * ================================================================ WORKSPACE
	 * CANCEL ================================================================
	 */

	@DeleteMapping("/{appointmentId}")
	public ApiResponse cancelAppointment(@PathVariable Long appointmentId, @RequestParam Long tenantId) {

		return lifecycleService.cancelWorkspaceAppointment(tenantId, appointmentId);
	}

	/*
	 * ================================================================ PATIENT
	 * CANCEL FUTURE APPOINTMENT
	 * ================================================================
	 */

	@PutMapping("/patient/{appointmentId}/cancel")
	public ResponseEntity<?> cancelPatientAppointment(@PathVariable Long appointmentId, @RequestParam Long tenantId) {

		try {

			return ResponseEntity.ok(lifecycleService.cancelPatientAppointment(tenantId, appointmentId));

		} catch (RuntimeException exception) {

			return ResponseEntity.badRequest()
					.body(Map.of("message", safeMessage(exception, "Unable to cancel appointment.")));
		}
	}

	/*
	 * ================================================================ PATIENT
	 * DELETE EXPIRED APPOINTMENT
	 * ================================================================
	 */

	@DeleteMapping("/patient/{appointmentId}")
	public ResponseEntity<?> deleteExpiredPatientAppointment(@PathVariable Long appointmentId,
			@RequestParam Long tenantId) {

		try {

			return ResponseEntity.ok(appointmentService.deleteExpiredPatientAppointment(tenantId, appointmentId));

		} catch (RuntimeException exception) {

			return ResponseEntity.badRequest()
					.body(Map.of("message", safeMessage(exception, "Unable to delete appointment.")));
		}
	}

	/*
	 * ================================================================ VERIFY
	 * ONLINE PAYMENT
	 * ================================================================
	 */

	@GetMapping("/payment/verify")
	public ResponseEntity<?> verifyOnlinePayment(@RequestParam Long appointmentId,
			@RequestParam String merchantOrderId) {

		try {

			return ResponseEntity.ok(paymentService.verifyPayment(appointmentId, merchantOrderId));

		} catch (RuntimeException exception) {

			return ResponseEntity.badRequest()
					.body(Map.of("message", safeMessage(exception, "Unable to verify payment.")));
		}
	}

	private String safeMessage(RuntimeException exception, String fallback) {

		if (exception == null || exception.getMessage() == null || exception.getMessage().isBlank()) {

			return fallback;
		}

		return exception.getMessage().trim();
	}
}