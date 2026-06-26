package com.example.medi.billing.dto;

public class ActivateSubscriptionRequest {

    private Long authUserId;
    private String role;
    private Long planId;

    public Long getAuthUserId() {
        return authUserId;
    }

    public String getRole() {
        return role;
    }

    public Long getPlanId() {
        return planId;
    }

    public void setAuthUserId(Long authUserId) {
        this.authUserId = authUserId;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }
}