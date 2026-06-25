package com.example.medi.hospital.dto;

public class HospitalPaymentStartResponse {

    private Long appointmentId;
    private String merchantOrderId;
    private String redirectUrl;

    public HospitalPaymentStartResponse() {
    }

    public HospitalPaymentStartResponse(Long appointmentId, String merchantOrderId, String redirectUrl) {
        this.appointmentId = appointmentId;
        this.merchantOrderId = merchantOrderId;
        this.redirectUrl = redirectUrl;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(Long appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getMerchantOrderId() {
        return merchantOrderId;
    }

    public void setMerchantOrderId(String merchantOrderId) {
        this.merchantOrderId = merchantOrderId;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }

    public void setRedirectUrl(String redirectUrl) {
        this.redirectUrl = redirectUrl;
    }
}