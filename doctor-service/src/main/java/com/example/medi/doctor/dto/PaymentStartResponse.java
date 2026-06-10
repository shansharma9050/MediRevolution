package com.example.medi.doctor.dto;

public class PaymentStartResponse {

    private Long appointmentId;
    private String merchantOrderId;
    private String redirectUrl;

    public PaymentStartResponse(Long appointmentId, String merchantOrderId, String redirectUrl) {
        this.appointmentId = appointmentId;
        this.merchantOrderId = merchantOrderId;
        this.redirectUrl = redirectUrl;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public String getMerchantOrderId() {
        return merchantOrderId;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }
}