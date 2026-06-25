package com.example.medi.hospital.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.example.medi.hospital.dto.SubscriptionCheckResponse;

@FeignClient(name = "billing-service")
public interface BillingClient {

    @GetMapping("/billing/subscriptions/check/{authUserId}")
    SubscriptionCheckResponse checkSubscription(@PathVariable Long authUserId);
}