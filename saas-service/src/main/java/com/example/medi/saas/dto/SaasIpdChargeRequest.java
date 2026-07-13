package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasIpdChargeRequest {

    private Long tenantId;

    private Long admissionId;

    private String chargeType;

    private String description;

    private BigDecimal amount;
}