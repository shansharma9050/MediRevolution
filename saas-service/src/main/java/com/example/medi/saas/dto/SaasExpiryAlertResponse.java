package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasExpiryAlertResponse {

    private String severity;

    private String title;

    private String message;

    private Long affectedBatchCount;

    private Integer affectedQuantity;

    private BigDecimal stockValueAtRisk;

    private String actionUrl;
}