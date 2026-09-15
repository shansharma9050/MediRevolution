package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasDiagnosticPdfService;
import com.example.medi.saas.service.SaasDiagnosticService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/diagnostics")
public class SaasDiagnosticController {

	private final SaasDiagnosticService diagnosticService;
	private final SaasDiagnosticPdfService pdfService;

	public SaasDiagnosticController(SaasDiagnosticService diagnosticService, SaasDiagnosticPdfService pdfService) {

		this.diagnosticService = diagnosticService;

		this.pdfService = pdfService;
	}

	/*
	 * ================================================================ TEST MASTER
	 * ================================================================
	 */

	@PostMapping("/tests")
	public SaasDiagnosticTestResponse createTest(@RequestBody SaasDiagnosticTestRequest request) {

		return diagnosticService.createTest(request);
	}

	@GetMapping("/tests")
	public List<SaasDiagnosticTestResponse> getTests(@RequestParam Long tenantId, @RequestParam String type) {

		return diagnosticService.getTests(tenantId, type);
	}

	/*
	 * ================================================================ ORDERS
	 * ================================================================
	 */

	@PostMapping("/orders")
	public SaasDiagnosticOrderResponse createOrder(@RequestBody SaasDiagnosticOrderRequest request) {

		return diagnosticService.createOrder(request);
	}

	@GetMapping("/orders")
	public List<SaasDiagnosticOrderResponse> getOrders(@RequestParam Long tenantId,
			@RequestParam(required = false) String type) {

		return diagnosticService.getOrders(tenantId, type);
	}

	@GetMapping("/orders/{orderId}")
	public SaasDiagnosticOrderResponse getOrder(@PathVariable Long orderId, @RequestParam Long tenantId) {

		return diagnosticService.getOrder(tenantId, orderId);
	}

	@GetMapping("/orders/patient")
	public List<SaasDiagnosticOrderResponse> getPatientOrders(@RequestParam Long tenantId,
			@RequestParam Long patientId) {

		return diagnosticService.getPatientOrders(tenantId, patientId);
	}

	@GetMapping("/orders/doctor")
	public List<SaasDiagnosticOrderResponse> getDoctorOrders(@RequestParam Long tenantId,
			@RequestParam Long doctorProfileId) {

		return diagnosticService.getDoctorOrders(tenantId, doctorProfileId);
	}

	/*
	 * ================================================================ STATUS
	 * ================================================================
	 */

	@PutMapping("/orders/{orderId}/status")
	public SaasDiagnosticOrderResponse updateStatus(@PathVariable Long orderId, @RequestParam Long tenantId,
			@RequestParam String status) {

		return diagnosticService.updateStatus(tenantId, orderId, status);
	}

	/*
	 * ================================================================ RESULT
	 * ================================================================
	 */

	@PutMapping("/orders/{orderId}/result")
	public SaasDiagnosticOrderResponse updateResult(@PathVariable Long orderId,
			@RequestBody SaasDiagnosticResultRequest request) {

		return diagnosticService.updateResult(orderId, request);
	}

	/*
	 * ================================================================ BILLING
	 * ================================================================
	 */

	@PostMapping("/orders/{orderId}/invoice")
	public SaasInvoiceResponse createInvoice(@PathVariable Long orderId, @RequestParam Long tenantId) {

		return diagnosticService.createInvoice(tenantId, orderId);
	}

	/*
	 * ================================================================ STAFF PDF
	 * ================================================================
	 */

	@GetMapping("/orders/{orderId}/pdf")
	public ResponseEntity<byte[]> downloadPdf(@PathVariable Long orderId, @RequestParam Long tenantId) {

		return pdfResponse(pdfService.generateDiagnosticPdf(tenantId, orderId), orderId);
	}

	/*
	 * ================================================================ PATIENT SELF
	 * ================================================================
	 */

	@GetMapping("/orders/my")
	public List<SaasDiagnosticOrderResponse> getMyOrders(@RequestParam Long tenantId) {

		return diagnosticService.getMyOrders(tenantId);
	}

	@GetMapping("/orders/my/{orderId}")
	public SaasDiagnosticOrderResponse getMyOrder(@PathVariable Long orderId, @RequestParam Long tenantId) {

		return diagnosticService.getMyOrder(tenantId, orderId);
	}

	@GetMapping("/orders/my/{orderId}/pdf")
	public ResponseEntity<byte[]> downloadMyPdf(@PathVariable Long orderId, @RequestParam Long tenantId) {

		return pdfResponse(pdfService.generatePatientDiagnosticPdf(tenantId, orderId), orderId);
	}

	private ResponseEntity<byte[]> pdfResponse(byte[] pdf, Long orderId) {

		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"diagnostic-report-" + orderId + ".pdf\"")
				.header(HttpHeaders.CACHE_CONTROL, "no-store").header("X-Content-Type-Options", "nosniff")
				.contentType(MediaType.APPLICATION_PDF).body(pdf);
	}
}