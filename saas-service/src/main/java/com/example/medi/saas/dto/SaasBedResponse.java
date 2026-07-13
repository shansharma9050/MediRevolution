package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasBedResponse {

    private Long id;

    private Long tenantId;

    private Long wardId;

    private String wardName;

    private String bedNumber;

    private BigDecimal dailyCharge;

    private String status;

    private Boolean active;
}