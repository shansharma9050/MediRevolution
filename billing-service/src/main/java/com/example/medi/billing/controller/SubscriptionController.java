package com.example.medi.billing.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.example.medi.billing.dto.ActivateSubscriptionRequest;
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

    @PostMapping("/activate")
    public UserSubscription activateSubscription(@RequestBody ActivateSubscriptionRequest request) {
        return subscriptionService.activateSubscription(request);
    }

    @GetMapping("/check/{authUserId}")
    public SubscriptionCheckResponse checkSubscription(@PathVariable Long authUserId) {
        return subscriptionService.checkSubscription(authUserId);
    }

    @GetMapping("/latest/{authUserId}")
    public UserSubscription getLatestSubscription(@PathVariable Long authUserId) {
        return subscriptionService.getLatestSubscription(authUserId);
    }
    
    @GetMapping("/current")
    public UserSubscription getCurrentSubscription() {
        Long authUserId = CurrentUserUtil.getUserId();

        if (authUserId == null) {
            throw new RuntimeException("User not found from token");
        }

        return subscriptionService.getCurrentActiveSubscription(authUserId);
    }
    
    @PostMapping("/subscribe")
    public SubscribePlanResponse subscribePlan(@RequestBody SubscribePlanRequest request) {
        return subscriptionService.subscribePlan(request);
    }
    
    @PostMapping("/payments/verify")
    public SubscriptionPaymentVerifyResponse verifySubscriptionPayment(
            @RequestParam Long paymentId,
            @RequestParam String merchantOrderId
    ) {
        return subscriptionService.verifySubscriptionPayment(paymentId, merchantOrderId);
    }
    
    @GetMapping("/payments/verify")
    public SubscriptionPaymentVerifyResponse verifySubscriptionPaymentGet(
            @RequestParam Long paymentId,
            @RequestParam String merchantOrderId
    ) {
        return subscriptionService.verifySubscriptionPayment(paymentId, merchantOrderId);
    }
}