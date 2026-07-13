package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasIpdDischargeRequest {

    private Long tenantId;

    private String dischargeSummary;

    private String dischargeAdvice;
}