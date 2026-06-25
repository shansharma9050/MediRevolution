package com.example.medi.billing.dto;

import com.example.medi.billing.entity.SubscriptionPlan;

import java.math.BigDecimal;

public class PlanResponse {

    private Long id;
    private String planCode;
    private String planName;
    private String targetRole;
    private BigDecimal monthlyPrice;
    private BigDecimal yearlyPrice;
    private Integer maxProducts;
    private Integer maxPatients;
    private Integer maxAppointments;
    private Integer maxDoctors;
    private Boolean onlineConsultationEnabled;
    private Boolean reportsEnabled;
    private Boolean prioritySupportEnabled;

    public PlanResponse(SubscriptionPlan plan) {
        this.id = plan.getId();
        this.planCode = plan.getPlanCode();
        this.planName = plan.getPlanName();
        this.targetRole = plan.getTargetRole();
        this.monthlyPrice = plan.getMonthlyPrice();
        this.yearlyPrice = plan.getYearlyPrice();
        this.maxProducts = plan.getMaxProducts();
        this.maxPatients = plan.getMaxPatients();
        this.maxAppointments = plan.getMaxAppointments();
        this.maxDoctors = plan.getMaxDoctors();
        this.onlineConsultationEnabled = plan.getOnlineConsultationEnabled();
        this.reportsEnabled = plan.getReportsEnabled();
        this.prioritySupportEnabled = plan.getPrioritySupportEnabled();
    }

    public Long getId() {
        return id;
    }

    public String getPlanCode() {
        return planCode;
    }

    public String getPlanName() {
        return planName;
    }

    public String getTargetRole() {
        return targetRole;
    }

    public BigDecimal getMonthlyPrice() {
        return monthlyPrice;
    }

    public BigDecimal getYearlyPrice() {
        return yearlyPrice;
    }

    public Integer getMaxProducts() {
        return maxProducts;
    }

    public Integer getMaxPatients() {
        return maxPatients;
    }

    public Integer getMaxAppointments() {
        return maxAppointments;
    }

    public Integer getMaxDoctors() {
        return maxDoctors;
    }

    public Boolean getOnlineConsultationEnabled() {
        return onlineConsultationEnabled;
    }

    public Boolean getReportsEnabled() {
        return reportsEnabled;
    }

    public Boolean getPrioritySupportEnabled() {
        return prioritySupportEnabled;
    }
}