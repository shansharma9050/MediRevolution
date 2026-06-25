package com.example.medi.medicine.client;


import com.example.medi.medicine.dto.SubscriptionCheckResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "billing-service")
public interface BillingClient {

    @GetMapping("/billing/subscriptions/check/{authUserId}")
    SubscriptionCheckResponse checkSubscription(@PathVariable Long authUserId);
}