package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasAppointmentRequest;
import com.example.medi.saas.dto.SaasAppointmentResponse;
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

	public SaasAppointmentController(SaasAppointmentService appointmentService,
			SaasAppointmentPaymentService paymentService) {
		this.appointmentService = appointmentService;

		this.paymentService = paymentService;
	}

	/*
	 * OFFLINE appointment
	 */
	@PostMapping
	public SaasAppointmentResponse createAppointment(@RequestBody SaasAppointmentRequest request) {

		return appointmentService.createAppointment(request);
	}

	/*
	 * ONLINE appointment: create appointment + PhonePe checkout
	 */
	@PostMapping("/online-payment")
	public ResponseEntity<?> startOnlinePayment(@RequestBody SaasAppointmentRequest request) {

		try {

			return ResponseEntity.ok(paymentService.bookOnlineAppointmentAndStartPayment(request));

		} catch (RuntimeException e) {

			return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
		}
	}

	/*
	 * Workspace appointment register
	 */
	@GetMapping
	public List<SaasAppointmentResponse> getAppointments(@RequestParam Long tenantId) {

		return appointmentService.getAppointments(tenantId);
	}

	/*
	 * Logged-in PATIENT only
	 */
	@GetMapping("/patient")
	public List<SaasAppointmentResponse> getMyPatientAppointments(@RequestParam Long tenantId) {

		return appointmentService.getMyPatientAppointments(tenantId);
	}

	@GetMapping("/{appointmentId}")
	public SaasAppointmentResponse getAppointment(@PathVariable Long appointmentId, @RequestParam Long tenantId) {

		return appointmentService.getAppointment(tenantId, appointmentId);
	}

	@GetMapping("/doctor")
	public List<SaasAppointmentResponse> getDoctorAppointments(@RequestParam Long tenantId,
			@RequestParam Long doctorAuthUserId) {

		return appointmentService.getDoctorAppointments(tenantId, doctorAuthUserId);
	}

	@PutMapping("/{appointmentId}")
	public SaasAppointmentResponse updateAppointment(@PathVariable Long appointmentId, @RequestParam Long tenantId,
			@RequestBody SaasAppointmentRequest request) {

		return appointmentService.updateAppointment(tenantId, appointmentId, request);
	}

	@PutMapping("/{appointmentId}/status")
	public SaasAppointmentResponse updateStatus(@PathVariable Long appointmentId, @RequestParam Long tenantId,
			@RequestParam String status) {

		return appointmentService.updateStatus(tenantId, appointmentId, status);
	}

	@DeleteMapping("/{appointmentId}")
	public ApiResponse cancelAppointment(@PathVariable Long appointmentId, @RequestParam Long tenantId) {

		return appointmentService.cancelAppointment(tenantId, appointmentId);
	}

	/*
	 * ========================================================= PATIENT DELETE
	 * EXPIRED APPOINTMENT =========================================================
	 *
	 * Patient sirf apne expired appointment ko remove kar sakta hai. Ye normal
	 * workspace DELETE permission par depend nahi karega.
	 *
	 */
	@DeleteMapping("/patient/{appointmentId}")
	public ResponseEntity<?> deleteExpiredPatientAppointment(@PathVariable Long appointmentId,
			@RequestParam Long tenantId) {

		try {

			return ResponseEntity.ok(appointmentService.deleteExpiredPatientAppointment(tenantId, appointmentId));

		} catch (RuntimeException e) {

			return ResponseEntity.badRequest()
					.body(Map.of("message", e.getMessage() == null ? "Unable to delete appointment." : e.getMessage()));
		}
	}

	@GetMapping("/payment/verify")
	public ResponseEntity<?> verifyOnlinePayment(@RequestParam Long appointmentId,
			@RequestParam String merchantOrderId) {

		try {

			return ResponseEntity.ok(paymentService.verifyPayment(appointmentId, merchantOrderId));

		} catch (RuntimeException e) {

			return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
		}
	}
}