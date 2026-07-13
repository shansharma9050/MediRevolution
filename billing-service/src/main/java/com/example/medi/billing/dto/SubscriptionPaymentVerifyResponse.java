package com.example.medi.billing.dto;

import java.time.LocalDate;

public class SubscriptionPaymentVerifyResponse {

    private boolean success;
    private String message;
    private Long subscriptionId;
    private Long paymentId;
    private String merchantOrderId;
    private String planCode;
    private String planName;
    private LocalDate startDate;
    private LocalDate endDate;

    public SubscriptionPaymentVerifyResponse() {
    }

    public SubscriptionPaymentVerifyResponse(
            boolean success,
            String message,
            Long subscriptionId,
            Long paymentId,
            String merchantOrderId,
            String planCode,
            String planName,
            LocalDate startDate,
            LocalDate endDate
    ) {
        this.success = success;
        this.message = message;
        this.subscriptionId = subscriptionId;
        this.paymentId = paymentId;
        this.merchantOrderId = merchantOrderId;
        this.planCode = planCode;
        this.planName = planName;
        this.startDate = startDate;
        this.endDate = endDate;
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

    public Long getPaymentId() {
        return paymentId;
    }

    public String getMerchantOrderId() {
        return merchantOrderId;
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

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setSubscriptionId(Long subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }

    public void setMerchantOrderId(String merchantOrderId) {
        this.merchantOrderId = merchantOrderId;
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
}