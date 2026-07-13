package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasBedRequest {

    private Long tenantId;

    private Long wardId;

    private String bedNumber;

    private BigDecimal dailyCharge;
}