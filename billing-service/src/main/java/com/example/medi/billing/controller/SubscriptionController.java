package com.example.medi.billing.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.medi.billing.dto.SubscribePlanRequest;
import com.example.medi.billing.dto.SubscribePlanResponse;
import com.example.medi.billing.dto.SubscriptionCheckResponse;
import com.example.medi.billing.dto.SubscriptionPaymentVerifyResponse;
import com.example.medi.billing.entity.SubscriptionPlan;
import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.security.CurrentUserUtil;
import com.example.medi.billing.service.SubscriptionService;

@RestController
@RequestMapping("/billing/subscriptions")
public class SubscriptionController {

	private final SubscriptionService subscriptionService;

	public SubscriptionController(SubscriptionService subscriptionService) {
		this.subscriptionService = subscriptionService;
	}

	// ============================================================
	// PLANS
	// ============================================================

	@PostMapping("/plans")
	public SubscriptionPlan createPlan(@RequestBody SubscriptionPlan plan) {

		return subscriptionService.createPlan(plan);
	}

	@GetMapping("/plans")
	public List<SubscriptionPlan> getAllActivePlans() {

		return subscriptionService.getAllActivePlans();
	}

	@GetMapping("/plans/{role}")
	public List<SubscriptionPlan> getPlansByRole(@PathVariable String role) {

		return subscriptionService.getPlansByRole(role);
	}

	// ============================================================
	// CHECK
	// ============================================================

	@GetMapping("/check")
	public SubscriptionCheckResponse checkSubscription(@RequestParam(required = false) Long tenantId) {

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new RuntimeException("User not found from token");
		}

		return subscriptionService.checkSubscription(authUserId, tenantId);
	}

	// ============================================================
	// CURRENT
	// ============================================================

	@GetMapping("/current")
	public UserSubscription getCurrentSubscription(@RequestParam(required = false) Long tenantId) {

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new RuntimeException("User not found from token");
		}

		return subscriptionService.getCurrentActiveSubscription(authUserId, tenantId);
	}

	// ============================================================
	// LATEST
	// ============================================================

	@GetMapping("/latest")
	public UserSubscription getLatestSubscription(@RequestParam(required = false) Long tenantId) {

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new RuntimeException("User not found from token");
		}

		return subscriptionService.getLatestSubscription(authUserId, tenantId);
	}

	// ============================================================
	// START PAYMENT
	// ============================================================

	@PostMapping("/subscribe")
	public SubscribePlanResponse subscribePlan(@RequestBody SubscribePlanRequest request) {

		return subscriptionService.subscribePlan(request);
	}

	// ============================================================
	// VERIFY PAYMENT
	// ============================================================

	@PostMapping("/payments/verify")
	public SubscriptionPaymentVerifyResponse verifySubscriptionPayment(@RequestParam Long paymentId,
			@RequestParam String merchantOrderId) {

		return subscriptionService.verifySubscriptionPayment(paymentId, merchantOrderId);
	}

	/*
	 * Keep this GET endpoint only if your payment-success page/browser flow needs
	 * it.
	 */
	@GetMapping("/payments/verify")
	public SubscriptionPaymentVerifyResponse verifySubscriptionPaymentGet(@RequestParam Long paymentId,
			@RequestParam String merchantOrderId) {

		return subscriptionService.verifySubscriptionPayment(paymentId, merchantOrderId);
	}

	// ============================================================
	// CANCEL
	// ============================================================

	@PutMapping("/cancel")
	public UserSubscription cancelCurrentSubscription(@RequestParam(required = false) Long tenantId) {

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new RuntimeException("User not found from token");
		}

		return subscriptionService.cancelCurrentSubscription(authUserId, tenantId);
	}
}