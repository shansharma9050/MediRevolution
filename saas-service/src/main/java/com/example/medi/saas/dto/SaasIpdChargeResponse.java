package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasIpdChargeResponse {

    private Long id;

    private Long tenantId;

    private Long admissionId;

    private String chargeType;

    private String description;

    private BigDecimal amount;

    private LocalDateTime chargeDateTime;
}