package com.example.medi.billing.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.medi.billing.dto.ActivateSubscriptionRequest;
import com.example.medi.billing.dto.SubscribePlanRequest;
import com.example.medi.billing.dto.SubscribePlanResponse;
import com.example.medi.billing.dto.SubscriptionCheckResponse;
import com.example.medi.billing.dto.SubscriptionPaymentVerifyResponse;
import com.example.medi.billing.entity.SubscriptionPayment;
import com.example.medi.billing.entity.SubscriptionPlan;
import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.PaymentGateway;
import com.example.medi.billing.enums.SubscriptionPaymentStatus;
import com.example.medi.billing.enums.SubscriptionRole;
import com.example.medi.billing.enums.SubscriptionStatus;
import com.example.medi.billing.repository.SubscriptionPaymentRepository;
import com.example.medi.billing.repository.SubscriptionPlanRepository;
import com.example.medi.billing.repository.UserSubscriptionRepository;
import com.example.medi.billing.security.CurrentUserUtil;

@Service
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final PhonePeSubscriptionService phonePeSubscriptionService;

    public SubscriptionService(
            SubscriptionPlanRepository planRepository,
            UserSubscriptionRepository subscriptionRepository,
            SubscriptionPaymentRepository paymentRepository,
            PhonePeSubscriptionService phonePeSubscriptionService
    ) {
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.phonePeSubscriptionService = phonePeSubscriptionService;
    }

    public SubscriptionPlan createPlan(SubscriptionPlan plan) {

        if (plan.getDurationDays() == null || plan.getDurationDays() <= 0) {
            throw new RuntimeException("Plan duration days is required");
        }

        if (plan.getActive() == null) {
            plan.setActive(true);
        }

        return planRepository.save(plan);
    }

    public List<SubscriptionPlan> getAllActivePlans() {
        return planRepository.findByActiveTrue();
    }

    public List<SubscriptionPlan> getPlansByRole(String role) {

        if (role == null || role.isBlank()) {
            throw new RuntimeException("Role is required");
        }

        String cleanRole = role.trim().toUpperCase();

        System.out.println("Loading subscription plans for role = " + cleanRole);

        SubscriptionRole subscriptionRole;

        try {
            subscriptionRole = SubscriptionRole.valueOf(cleanRole);
        } catch (Exception e) {
            throw new RuntimeException("Invalid subscription role: " + cleanRole);
        }

        return planRepository.findByRoleAndActiveTrue(subscriptionRole);
    }

    public UserSubscription activateSubscription(ActivateSubscriptionRequest request) {

        if (request.getAuthUserId() == null) {
            throw new RuntimeException("authUserId is required");
        }

        if (request.getRole() == null || request.getRole().isBlank()) {
            throw new RuntimeException("role is required");
        }

        if (request.getPlanId() == null) {
            throw new RuntimeException("planId is required");
        }

        SubscriptionPlan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        SubscriptionRole role = SubscriptionRole.valueOf(request.getRole().toUpperCase());

        if (plan.getRole() != role) {
            throw new RuntimeException("Selected plan does not belong to user role");
        }

        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(plan.getDurationDays());

        UserSubscription subscription = new UserSubscription();
        subscription.setAuthUserId(request.getAuthUserId());
        subscription.setRole(role);
        subscription.setPlan(plan);
        subscription.setStartDate(startDate);
        subscription.setEndDate(endDate);
        subscription.setStatus(SubscriptionStatus.ACTIVE);

        return subscriptionRepository.save(subscription);
    }
    
    public SubscribePlanResponse subscribePlan(SubscribePlanRequest request) {

        if (request.getPlanCode() == null || request.getPlanCode().isBlank()) {
            throw new RuntimeException("Invalid plan selected");
        }

        if (request.getBillingCycle() == null || request.getBillingCycle().isBlank()) {
            throw new RuntimeException("Billing cycle is required");
        }

        Long authUserId = CurrentUserUtil.getUserId();
        String currentRole = CurrentUserUtil.getRole();

        if (authUserId == null) {
            throw new RuntimeException("User not found from token");
        }

        if (!"WHOLESALER".equals(currentRole)
                && !"DOCTOR".equals(currentRole)
                && !"HOSPITAL".equals(currentRole)) {
            throw new RuntimeException("Subscription is available only for Wholesaler, Doctor and Hospital");
        }

        BillingCycle billingCycle = BillingCycle.valueOf(request.getBillingCycle().toUpperCase());

        SubscriptionPlan plan = planRepository.findByPlanCodeAndActiveTrue(request.getPlanCode())
                .orElseThrow(() -> new RuntimeException("Invalid plan selected"));

        SubscriptionRole userRole = SubscriptionRole.valueOf(currentRole);

        if (plan.getRole() != userRole) {
            throw new RuntimeException("Selected plan does not belong to your role");
        }

        BigDecimal amount = plan.getPrice();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            if (plan.getBillingCycle() == BillingCycle.YEARLY) {
                amount = plan.getYearlyPrice();
            } else {
                amount = plan.getMonthlyPrice();
            }
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Plan amount is not configured");
        }

        String merchantOrderId = "MR-SUB-" + UUID.randomUUID();

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setAuthUserId(authUserId);
        payment.setUserRole(currentRole);
        payment.setPlanId(plan.getId());
        payment.setPlanCode(plan.getPlanCode());
        payment.setAmount(amount);
        payment.setBillingCycle(billingCycle);
        payment.setMerchantOrderId(merchantOrderId);
        payment.setPaymentStatus(SubscriptionPaymentStatus.INITIATED);
        payment.setPaymentGateway(PaymentGateway.PHONEPE);

        SubscriptionPayment savedPayment = paymentRepository.save(payment);

        Long amountInPaise = amount.multiply(BigDecimal.valueOf(100)).longValue();

        String redirectUrl = phonePeSubscriptionService.createCheckoutPayment(
                merchantOrderId,
                amountInPaise,
                savedPayment.getId()
        );

        return new SubscribePlanResponse(
                true,
                "Subscription payment initiated",
                savedPayment.getId(),
                merchantOrderId,
                redirectUrl
        );
    }
    public SubscriptionCheckResponse checkSubscription(Long authUserId) {

        return subscriptionRepository
                .findTopByAuthUserIdAndStatusAndEndDateGreaterThanEqualOrderByEndDateDesc(
                        authUserId,
                        SubscriptionStatus.ACTIVE,
                        LocalDate.now()
                )
                .map(subscription -> {

                    SubscriptionPlan plan = subscription.getPlan();

                    return new SubscriptionCheckResponse(
                            true,
                            subscription.getAuthUserId(),
                            subscription.getRole().name(),
                            plan.getId(),
                            plan.getPlanName(),
                            subscription.getStartDate(),
                            subscription.getEndDate(),
                            plan.getMaxMedicines(),
                            plan.getMaxAppointments(),
                            plan.getMaxStaff(),
                            plan.getVideoConsultationAllowed()
                    );
                })
                .orElseGet(() -> new SubscriptionCheckResponse(
                        false,
                        authUserId,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        false
                ));
    }

    public UserSubscription getLatestSubscription(Long authUserId) {
        return subscriptionRepository.findTopByAuthUserIdOrderByCreatedAtDesc(authUserId)
                .orElseThrow(() -> new RuntimeException("No subscription found"));
    }
    
    public SubscriptionPaymentVerifyResponse verifySubscriptionPayment(
            Long paymentId,
            String merchantOrderId
    ) {
        if (paymentId == null) {
            throw new RuntimeException("paymentId is required");
        }

        if (merchantOrderId == null || merchantOrderId.isBlank()) {
            throw new RuntimeException("merchantOrderId is required");
        }

        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Subscription payment not found"));

        if (!merchantOrderId.equals(payment.getMerchantOrderId())) {
            throw new RuntimeException("Invalid merchant order id");
        }

        if (SubscriptionPaymentStatus.SUCCESS.equals(payment.getPaymentStatus())
                && payment.getSubscriptionId() != null) {

            UserSubscription existingSubscription = subscriptionRepository.findById(payment.getSubscriptionId())
                    .orElseThrow(() -> new RuntimeException("Subscription not found"));

            SubscriptionPlan existingPlan = existingSubscription.getPlan();

            return new SubscriptionPaymentVerifyResponse(
                    true,
                    "Subscription already activated",
                    existingSubscription.getId(),
                    payment.getId(),
                    payment.getMerchantOrderId(),
                    existingPlan.getPlanCode(),
                    existingPlan.getPlanName(),
                    existingSubscription.getStartDate(),
                    existingSubscription.getEndDate()
            );
        }

        String phonePeStatus = phonePeSubscriptionService.checkPaymentStatus(merchantOrderId);

        System.out.println("PhonePe subscription payment status = " + phonePeStatus);

        if (!isPhonePePaymentSuccess(phonePeStatus)) {
            payment.setPaymentStatus(SubscriptionPaymentStatus.FAILED);
            payment.touch();
            paymentRepository.save(payment);

            return new SubscriptionPaymentVerifyResponse(
                    false,
                    "Payment not successful. Current status: " + phonePeStatus,
                    null,
                    payment.getId(),
                    payment.getMerchantOrderId(),
                    payment.getPlanCode(),
                    null,
                    null,
                    null
            );
        }

        SubscriptionPlan plan = planRepository.findById(payment.getPlanId())
                .orElseThrow(() -> new RuntimeException("Subscription plan not found"));

        LocalDate startDate = LocalDate.now();

        Integer durationDays = plan.getDurationDays();

        if (durationDays == null || durationDays <= 0) {
            durationDays = plan.getBillingCycle() == BillingCycle.YEARLY ? 365 : 30;
        }

        LocalDate endDate = startDate.plusDays(durationDays);

        subscriptionRepository
                .findTopByAuthUserIdAndStatusAndEndDateGreaterThanEqualOrderByEndDateDesc(
                        payment.getAuthUserId(),
                        SubscriptionStatus.ACTIVE,
                        LocalDate.now()
                )
                .ifPresent(oldSubscription -> {
                    oldSubscription.setStatus(SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(oldSubscription);
                });

        UserSubscription subscription = new UserSubscription();
        subscription.setAuthUserId(payment.getAuthUserId());
        subscription.setRole(SubscriptionRole.valueOf(payment.getUserRole()));
        subscription.setPlan(plan);
        subscription.setStartDate(startDate);
        subscription.setEndDate(endDate);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setPaymentOrderId(payment.getMerchantOrderId());
        subscription.setPaymentTransactionId(payment.getTransactionId());

        UserSubscription savedSubscription = subscriptionRepository.save(subscription);

        payment.setSubscriptionId(savedSubscription.getId());
        payment.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);
        payment.touch();
        paymentRepository.save(payment);

        return new SubscriptionPaymentVerifyResponse(
                true,
                "Subscription activated successfully",
                savedSubscription.getId(),
                payment.getId(),
                payment.getMerchantOrderId(),
                plan.getPlanCode(),
                plan.getPlanName(),
                savedSubscription.getStartDate(),
                savedSubscription.getEndDate()
        );
    }

    private boolean isPhonePePaymentSuccess(String status) {
        if (status == null) {
            return false;
        }

        String normalized = status.trim().toUpperCase();

        return normalized.equals("COMPLETED")
                || normalized.equals("SUCCESS")
                || normalized.equals("PAYMENT_SUCCESS")
                || normalized.equals("PAID");
    }
    
    public UserSubscription getCurrentActiveSubscription(Long authUserId) {

        return subscriptionRepository
                .findTopByAuthUserIdAndStatusAndEndDateGreaterThanEqualOrderByEndDateDesc(
                        authUserId,
                        SubscriptionStatus.ACTIVE,
                        LocalDate.now()
                )
                .orElseThrow(() -> new RuntimeException("No active subscription found."));
    }
}