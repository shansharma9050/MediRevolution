package com.example.medi.medicine.client;

import com.example.medi.medicine.dto.SubscriptionCheckResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "billing-service")
public interface BillingClient {

	/*
	 * Existing method. SaaS/old flow ke liye untouched.
	 */
	@GetMapping("/billing/subscriptions/check/{authUserId}")
	SubscriptionCheckResponse checkSubscription(@PathVariable Long authUserId);

	/*
	 * NEW Main Platform subscription check.
	 */
	@GetMapping("/billing/subscriptions/check")
	SubscriptionCheckResponse checkMainPlatformSubscription(@RequestHeader("Authorization") String authorization);
}