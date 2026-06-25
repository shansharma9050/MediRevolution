package com.example.medi.billing.dto;

import java.time.LocalDate;

public class SubscriptionCheckResponse {

    private boolean active;
    private String message;
    private String planCode;
    private String status;
    private LocalDate endDate;
    private Boolean onlineConsultationEnabled;
    private Boolean reportsEnabled;

    public SubscriptionCheckResponse(
            boolean active,
            String message,
            String planCode,
            String status,
            LocalDate endDate,
            Boolean onlineConsultationEnabled,
            Boolean reportsEnabled
    ) {
        this.active = active;
        this.message = message;
        this.planCode = planCode;
        this.status = status;
        this.endDate = endDate;
        this.onlineConsultationEnabled = onlineConsultationEnabled;
        this.reportsEnabled = reportsEnabled;
    }

    public boolean isActive() {
        return active;
    }

    public String getMessage() {
        return message;
    }

    public String getPlanCode() {
        return planCode;
    }

    public String getStatus() {
        return status;
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