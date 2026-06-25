package com.example.medi.billing.dto;

import com.example.medi.billing.entity.UserSubscription;

import java.time.LocalDate;

public class SubscriptionResponse {

    private Long subscriptionId;
    private Long authUserId;
    private String role;
    private String planCode;
    private String planName;
    private String billingCycle;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean onlineConsultationEnabled;
    private Boolean reportsEnabled;

    public SubscriptionResponse(UserSubscription subscription) {
        this.subscriptionId = subscription.getId();
        this.authUserId = subscription.getAuthUserId();
        this.role = subscription.getUserRole();
        this.planCode = subscription.getPlanCode();
        this.planName = subscription.getPlan().getPlanName();
        this.billingCycle = subscription.getBillingCycle().name();
        this.status = subscription.getStatus().name();
        this.startDate = subscription.getStartDate();
        this.endDate = subscription.getEndDate();
        this.onlineConsultationEnabled = subscription.getPlan().getOnlineConsultationEnabled();
        this.reportsEnabled = subscription.getPlan().getReportsEnabled();
    }

    public Long getSubscriptionId() {
        return subscriptionId;
    }

    public Long getAuthUserId() {
        return authUserId;
    }

    public String getRole() {
        return role;
    }

    public String getPlanCode() {
        return planCode;
    }

    public String getPlanName() {
        return planName;
    }

    public String getBillingCycle() {
        return billingCycle;
    }

    public String getStatus() {
        return status;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public Boolean getOnlineConsultationEnabled() {
        return onlineConsultationEnabled;
    }

    public Boolean getReportsEnabled() {
        return reportsEnabled;
    }
}