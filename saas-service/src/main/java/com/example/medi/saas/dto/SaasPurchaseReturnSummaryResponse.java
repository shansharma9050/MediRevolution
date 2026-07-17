package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasPurchaseReturnSummaryResponse {

    private Long totalReturns;

    private Long totalReturnedQuantity;

    private BigDecimal totalReturnAmount;
}