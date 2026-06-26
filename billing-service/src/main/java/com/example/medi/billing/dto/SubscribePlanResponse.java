package com.example.medi.billing.dto;

import java.time.LocalDate;

public class SubscribePlanResponse {

    private boolean success;
    private String message;
    private Long subscriptionId;
    private String planCode;
    private String planName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String redirectUrl;

    public SubscribePlanResponse() {
    }

    public SubscribePlanResponse(
            boolean success,
            String message,
            Long subscriptionId,
            String planCode,
            String planName,
            LocalDate startDate,
            LocalDate endDate,
            String redirectUrl
    ) {
        this.success = success;
        this.message = message;
        this.subscriptionId = subscriptionId;
        this.planCode = planCode;
        this.planName = planName;
        this.startDate = startDate;
        this.endDate = endDate;
        this.redirectUrl = redirectUrl;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public Long getSubscriptionId() {
        return subscriptionId;
    }

    public String getPlanCode() {
        return planCode;
    }

    public String getPlanName() {
        return planName;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setSubscriptionId(Long subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public void setRedirectUrl(String redirectUrl) {
        this.redirectUrl = redirectUrl;
    }
}