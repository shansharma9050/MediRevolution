package com.example.medi.billing.client;


import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.example.medi.billing.dto.SubscriptionCheckResponse;


@FeignClient(name = "billing-service")
public interface BillingClient {

    @GetMapping("/billing/subscriptions/check/{authUserId}")
    SubscriptionCheckResponse checkSubscription(@PathVariable("authUserId") Long authUserId);
}