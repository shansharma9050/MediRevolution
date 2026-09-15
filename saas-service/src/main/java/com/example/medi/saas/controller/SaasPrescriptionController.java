package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPrescriptionRequest;
import com.example.medi.saas.dto.SaasPrescriptionResponse;
import com.example.medi.saas.service.SaasPrescriptionPdfService;
import com.example.medi.saas.service.SaasPrescriptionService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/prescriptions")
public class SaasPrescriptionController {

	private final SaasPrescriptionService prescriptionService;

	private final SaasPrescriptionPdfService pdfService;

	public SaasPrescriptionController(SaasPrescriptionService prescriptionService,
			SaasPrescriptionPdfService pdfService) {

		this.prescriptionService = prescriptionService;

		this.pdfService = pdfService;
	}

	@PostMapping
	public SaasPrescriptionResponse createPrescription(@RequestBody SaasPrescriptionRequest request) {

		return prescriptionService.createPrescription(request);
	}

	@PutMapping("/{prescriptionId}")
	public SaasPrescriptionResponse updatePrescription(@PathVariable Long prescriptionId, @RequestParam Long tenantId,
			@RequestBody SaasPrescriptionRequest request) {

		return prescriptionService.updatePrescription(tenantId, prescriptionId, request);
	}

	@GetMapping
	public List<SaasPrescriptionResponse> getPrescriptions(@RequestParam Long tenantId) {

		return prescriptionService.getPrescriptions(tenantId);
	}

	@GetMapping("/patient")
	public List<SaasPrescriptionResponse> getPatientEmr(@RequestParam Long tenantId, @RequestParam Long patientId) {

		return prescriptionService.getPatientEmr(tenantId, patientId);
	}

	@GetMapping("/doctor")
	public List<SaasPrescriptionResponse> getDoctorPrescriptions(@RequestParam Long tenantId,
			@RequestParam Long doctorProfileId) {

		return prescriptionService.getDoctorPrescriptions(tenantId, doctorProfileId);
	}

	@GetMapping("/appointment")
	public List<SaasPrescriptionResponse> getAppointmentPrescriptions(@RequestParam Long tenantId,
			@RequestParam Long appointmentId) {

		return prescriptionService.getAppointmentPrescriptions(tenantId, appointmentId);
	}

	/*
	 * ================================================================ PATIENT
	 * PORTAL ================================================================
	 */

	@GetMapping("/my")
	public List<SaasPrescriptionResponse> getMyPrescriptions(@RequestParam Long tenantId) {

		return prescriptionService.getMyPrescriptions(tenantId);
	}

	@GetMapping("/my/{prescriptionId}")
	public SaasPrescriptionResponse getMyPrescription(@PathVariable Long prescriptionId, @RequestParam Long tenantId) {

		return prescriptionService.getMyPrescription(tenantId, prescriptionId);
	}

	@GetMapping("/my/{prescriptionId}/pdf")
	public ResponseEntity<byte[]> downloadMyPrescriptionPdf(@PathVariable Long prescriptionId,
			@RequestParam Long tenantId) {

		byte[] pdf = pdfService.generatePatientPrescriptionPdf(tenantId, prescriptionId);

		return buildPdfResponse(prescriptionId, pdf);
	}

	/*
	 * ================================================================ STAFF
	 * ================================================================
	 */

	@GetMapping("/{prescriptionId}")
	public SaasPrescriptionResponse getPrescription(@PathVariable Long prescriptionId, @RequestParam Long tenantId) {

		return prescriptionService.getPrescription(tenantId, prescriptionId);
	}

	@GetMapping("/{prescriptionId}/pdf")
	public ResponseEntity<byte[]> downloadPrescriptionPdf(@PathVariable Long prescriptionId,
			@RequestParam Long tenantId) {

		byte[] pdf = pdfService.generatePrescriptionPdf(tenantId, prescriptionId);

		return buildPdfResponse(prescriptionId, pdf);
	}

	@DeleteMapping("/{prescriptionId}")
	public ApiResponse deletePrescription(@PathVariable Long prescriptionId, @RequestParam Long tenantId) {

		return prescriptionService.deletePrescription(tenantId, prescriptionId);
	}

	private ResponseEntity<byte[]> buildPdfResponse(Long prescriptionId, byte[] pdf) {

		String filename = "saas-prescription-" + prescriptionId + ".pdf";

		return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
				.header("X-Content-Type-Options", "nosniff").header(HttpHeaders.CACHE_CONTROL, "no-store")
				.contentType(MediaType.APPLICATION_PDF).body(pdf);
	}
}