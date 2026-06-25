package com.example.medi.billing.controller;

import com.example.medi.billing.dto.*;
import com.example.medi.billing.entity.SubscriptionPayment;
import com.example.medi.billing.security.CurrentUser;
import com.example.medi.billing.security.CurrentUserUtil;
import com.example.medi.billing.service.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/billing/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final CurrentUserUtil currentUserUtil;

    public SubscriptionController(
            SubscriptionService subscriptionService,
            CurrentUserUtil currentUserUtil
    ) {
        this.subscriptionService = subscriptionService;
        this.currentUserUtil = currentUserUtil;
    }

    @GetMapping("/plans")
    public List<PlanResponse> plans(HttpServletRequest request) {
        CurrentUser user = currentUserUtil.getCurrentUser(request);
        return subscriptionService.getPlansForCurrentRole(user);
    }

    @GetMapping("/current")
    public SubscriptionResponse current(HttpServletRequest request) {
        CurrentUser user = currentUserUtil.getCurrentUser(request);
        return subscriptionService.getCurrentSubscription(user);
    }

    @GetMapping("/check/{authUserId}")
    public SubscriptionCheckResponse check(@PathVariable Long authUserId) {
        return subscriptionService.checkSubscription(authUserId);
    }

    @PostMapping("/subscribe")
    public SubscriptionPaymentResponse subscribe(
            @RequestBody SubscribeRequest subscribeRequest,
            HttpServletRequest request
    ) {
        CurrentUser user = currentUserUtil.getCurrentUser(request);
        return subscriptionService.initiateSubscription(user, subscribeRequest);
    }

    @PostMapping("/payment/success")
    public SubscriptionResponse paymentSuccess(@RequestParam String merchantOrderId) {
        return subscriptionService.markSubscriptionPaymentSuccess(merchantOrderId);
    }

    @PutMapping("/cancel")
    public String cancel(HttpServletRequest request) {
        CurrentUser user = currentUserUtil.getCurrentUser(request);
        subscriptionService.cancelCurrentSubscription(user);
        return "Subscription cancelled successfully";
    }

    @GetMapping("/payments/my")
    public List<SubscriptionPayment> myPayments(HttpServletRequest request) {
        CurrentUser user = currentUserUtil.getCurrentUser(request);
        return subscriptionService.myPayments(user);
    }
}