package com.example.medi.billing.dto;

import com.example.medi.billing.enums.BillingCycle;

public class SubscribeRequest {

    private String planCode;
    private BillingCycle billingCycle;

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public BillingCycle getBillingCycle() {
        return billingCycle;
    }

    public void setBillingCycle(BillingCycle billingCycle) {
        this.billingCycle = billingCycle;
    }
}