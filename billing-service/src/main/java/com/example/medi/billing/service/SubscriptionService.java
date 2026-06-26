package com.example.medi.billing.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.example.medi.billing.dto.ActivateSubscriptionRequest;
import com.example.medi.billing.dto.SubscribePlanRequest;
import com.example.medi.billing.dto.SubscribePlanResponse;
import com.example.medi.billing.dto.SubscriptionCheckResponse;
import com.example.medi.billing.entity.SubscriptionPlan;
import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.SubscriptionRole;
import com.example.medi.billing.enums.SubscriptionStatus;
import com.example.medi.billing.repository.SubscriptionPlanRepository;
import com.example.medi.billing.repository.UserSubscriptionRepository;
import com.example.medi.billing.security.CurrentUserUtil;

@Service
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;

    public SubscriptionService(
            SubscriptionPlanRepository planRepository,
            UserSubscriptionRepository subscriptionRepository
    ) {
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
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

        LocalDate startDate = LocalDate.now();

        Integer durationDays = plan.getDurationDays();
        if (durationDays == null || durationDays <= 0) {
            durationDays = billingCycle == BillingCycle.YEARLY ? 365 : 30;
        }

        LocalDate endDate = startDate.plusDays(durationDays);

        UserSubscription subscription = new UserSubscription();
        subscription.setAuthUserId(authUserId);
        subscription.setRole(userRole);
        subscription.setPlan(plan);
        subscription.setStartDate(startDate);
        subscription.setEndDate(endDate);
        subscription.setStatus(SubscriptionStatus.ACTIVE);

        UserSubscription saved = subscriptionRepository.save(subscription);

        return new SubscribePlanResponse(
                true,
                "Subscription activated successfully",
                saved.getId(),
                plan.getPlanCode(),
                plan.getPlanName(),
                saved.getStartDate(),
                saved.getEndDate(),
                null
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
}