package com.example.medi.billing.service;

import org.springframework.stereotype.Service;

import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.entity.SubscriptionPlan;

@Service
public class SubscriptionAccessService {

	private final SubscriptionService subscriptionService;

	public SubscriptionAccessService(SubscriptionService subscriptionService) {
		this.subscriptionService = subscriptionService;
	}

	public UserSubscription requireActiveSubscription(Long authUserId) {

		UserSubscription subscription = subscriptionService.findCurrentActiveSubscription(authUserId);

		if (subscription == null) {
			throw new RuntimeException("Active subscription required");
		}

		return subscription;
	}

	public SubscriptionPlan requirePlan(Long authUserId) {

		UserSubscription subscription = requireActiveSubscription(authUserId);

		if (subscription.getPlan() == null) {
			throw new RuntimeException("Subscription plan not configured");
		}

		return subscription.getPlan();
	}
}