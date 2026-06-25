package com.example.medi.billing.service;

import com.example.medi.billing.dto.*;
import com.example.medi.billing.entity.SubscriptionPayment;
import com.example.medi.billing.entity.SubscriptionPlan;
import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.enums.*;
import com.example.medi.billing.repository.SubscriptionPaymentRepository;
import com.example.medi.billing.repository.SubscriptionPlanRepository;
import com.example.medi.billing.repository.UserSubscriptionRepository;
import com.example.medi.billing.security.CurrentUser;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository paymentRepository;

    public SubscriptionService(
            SubscriptionPlanRepository planRepository,
            UserSubscriptionRepository subscriptionRepository,
            SubscriptionPaymentRepository paymentRepository
    ) {
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
    }

    public List<PlanResponse> getPlansForCurrentRole(CurrentUser user) {
        validateSubscriptionAllowedRole(user.getRole());

        return planRepository
                .findByTargetRoleAndActiveTrueOrderByMonthlyPriceAsc(user.getRole())
                .stream()
                .map(PlanResponse::new)
                .collect(Collectors.toList());
    }

    public SubscriptionResponse getCurrentSubscription(CurrentUser user) {
        return subscriptionRepository
                .findFirstByAuthUserIdAndStatusOrderByEndDateDesc(
                        user.getUserId(),
                        SubscriptionStatus.ACTIVE
                )
                .filter(subscription -> !subscription.getEndDate().isBefore(LocalDate.now()))
                .map(SubscriptionResponse::new)
                .orElseThrow(() -> new RuntimeException("No active subscription found"));
    }

    public SubscriptionCheckResponse checkSubscription(Long authUserId) {
        return subscriptionRepository
                .findFirstByAuthUserIdAndStatusOrderByEndDateDesc(
                        authUserId,
                        SubscriptionStatus.ACTIVE
                )
                .filter(subscription -> !subscription.getEndDate().isBefore(LocalDate.now()))
                .map(subscription -> new SubscriptionCheckResponse(
                        true,
                        "Subscription active",
                        subscription.getPlanCode(),
                        subscription.getStatus().name(),
                        subscription.getEndDate(),
                        subscription.getPlan().getOnlineConsultationEnabled(),
                        subscription.getPlan().getReportsEnabled()
                ))
                .orElse(new SubscriptionCheckResponse(
                        false,
                        "No active subscription",
                        null,
                        null,
                        null,
                        false,
                        false
                ));
    }

    @Transactional
    public SubscriptionPaymentResponse initiateSubscription(CurrentUser user, SubscribeRequest request) {
        validateSubscriptionAllowedRole(user.getRole());

        if (request.getPlanCode() == null || request.getPlanCode().isBlank()) {
            throw new RuntimeException("Plan code is required");
        }

        BillingCycle billingCycle =
                request.getBillingCycle() == null ? BillingCycle.MONTHLY : request.getBillingCycle();

        SubscriptionPlan plan = planRepository
                .findByPlanCodeAndActiveTrue(request.getPlanCode())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        if (!plan.getTargetRole().equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("This plan is not allowed for your role");
        }

        BigDecimal amount = billingCycle == BillingCycle.YEARLY
                ? plan.getYearlyPrice()
                : plan.getMonthlyPrice();

        String merchantOrderId = "MR-SUB-" + UUID.randomUUID();

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setAuthUserId(user.getUserId());
        payment.setUserRole(user.getRole());
        payment.setPlanId(plan.getId());
        payment.setPlanCode(plan.getPlanCode());
        payment.setAmount(amount);
        payment.setBillingCycle(billingCycle);
        payment.setMerchantOrderId(merchantOrderId);
        payment.setPaymentStatus(SubscriptionPaymentStatus.INITIATED);
        payment.setPaymentGateway(PaymentGateway.MANUAL);

        paymentRepository.save(payment);

        /*
         * IMPORTANT:
         * Abhi local testing ke liye MANUAL payment flow diya hai.
         * PhonePe subscription payment connect karna ho to yahan redirectUrl PhonePe se generate karna.
         */
        String redirectUrl = "/subscription/payment-success?merchantOrderId=" + merchantOrderId;

        return new SubscriptionPaymentResponse(
                "Subscription payment initiated",
                merchantOrderId,
                amount,
                payment.getPaymentStatus().name(),
                redirectUrl
        );
    }

    @Transactional
    public SubscriptionResponse markSubscriptionPaymentSuccess(String merchantOrderId) {
        SubscriptionPayment payment = paymentRepository
                .findByMerchantOrderId(merchantOrderId)
                .orElseThrow(() -> new RuntimeException("Subscription payment not found"));

        if (payment.getPaymentStatus() == SubscriptionPaymentStatus.SUCCESS) {
            UserSubscription existing = subscriptionRepository
                    .findFirstByAuthUserIdOrderByIdDesc(payment.getAuthUserId())
                    .orElseThrow(() -> new RuntimeException("Subscription not found"));

            return new SubscriptionResponse(existing);
        }

        SubscriptionPlan plan = planRepository
                .findByPlanCodeAndActiveTrue(payment.getPlanCode())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        LocalDate startDate = LocalDate.now();
        LocalDate endDate = payment.getBillingCycle() == BillingCycle.YEARLY
                ? startDate.plusYears(1)
                : startDate.plusMonths(1);

        UserSubscription subscription = new UserSubscription();
        subscription.setAuthUserId(payment.getAuthUserId());
        subscription.setUserRole(payment.getUserRole());
        subscription.setPlan(plan);
        subscription.setPlanCode(plan.getPlanCode());
        subscription.setBillingCycle(payment.getBillingCycle());
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStartDate(startDate);
        subscription.setEndDate(endDate);
        subscription.setAutoRenew(false);

        UserSubscription savedSubscription = subscriptionRepository.save(subscription);

        payment.setSubscriptionId(savedSubscription.getId());
        payment.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);
        payment.setTransactionId(merchantOrderId);
        payment.touch();

        paymentRepository.save(payment);

        return new SubscriptionResponse(savedSubscription);
    }

    @Transactional
    public void cancelCurrentSubscription(CurrentUser user) {
        UserSubscription subscription = subscriptionRepository
                .findFirstByAuthUserIdAndStatusOrderByEndDateDesc(
                        user.getUserId(),
                        SubscriptionStatus.ACTIVE
                )
                .orElseThrow(() -> new RuntimeException("No active subscription found"));

        subscription.setStatus(SubscriptionStatus.CANCELLED);
        subscription.touch();

        subscriptionRepository.save(subscription);
    }

    public List<SubscriptionPayment> myPayments(CurrentUser user) {
        return paymentRepository.findByAuthUserIdOrderByIdDesc(user.getUserId());
    }

    private void validateSubscriptionAllowedRole(String role) {
        if (!"WHOLESALER".equalsIgnoreCase(role)
                && !"DOCTOR".equalsIgnoreCase(role)
                && !"HOSPITAL".equalsIgnoreCase(role)) {
            throw new RuntimeException("Subscription is available only for WHOLESALER, DOCTOR and HOSPITAL");
        }
    }
}