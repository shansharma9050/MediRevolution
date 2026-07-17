package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasPaymentRequest;
import com.example.medi.saas.dto.SaasPaymentResponse;
import com.example.medi.saas.dto.SaasPaymentSummaryResponse;
import com.example.medi.saas.service.SaasPaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/payments")
public class SaasPaymentController {

	private final SaasPaymentService paymentService;

	public SaasPaymentController(SaasPaymentService paymentService) {
		this.paymentService = paymentService;
	}

	@GetMapping
	public List<SaasPaymentResponse> getPayments(@RequestParam Long tenantId) {

		return paymentService.getPayments(tenantId);
	}

	@GetMapping("/search")
	public List<SaasPaymentResponse> searchPayments(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword) {

		return paymentService.searchPayments(tenantId, keyword);
	}

	@GetMapping("/summary")
	public SaasPaymentSummaryResponse getSummary(@RequestParam Long tenantId) {

		return paymentService.getSummary(tenantId);
	}

	@GetMapping("/{paymentId}")
	public SaasPaymentResponse getPayment(@PathVariable Long paymentId,

			@RequestParam Long tenantId) {

		return paymentService.getPayment(tenantId, paymentId);
	}

	@PostMapping
	public SaasPaymentResponse createPayment(@RequestBody SaasPaymentRequest request) {

		return paymentService.createPayment(request);
	}
}