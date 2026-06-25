package com.example.medi.billing.dto;

import java.math.BigDecimal;

public class SubscriptionPaymentResponse {

    private String message;
    private String merchantOrderId;
    private BigDecimal amount;
    private String paymentStatus;
    private String redirectUrl;

    public SubscriptionPaymentResponse(
            String message,
            String merchantOrderId,
            BigDecimal amount,
            String paymentStatus,
            String redirectUrl
    ) {
        this.message = message;
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.paymentStatus = paymentStatus;
        this.redirectUrl = redirectUrl;
    }

    public String getMessage() {
        return message;
    }

    public String getMerchantOrderId() {
        return merchantOrderId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }
}
