package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasPurchaseSummaryResponse {

    private Long totalPurchases;

    private BigDecimal totalPurchaseAmount;

    private BigDecimal totalPaidAmount;

    private BigDecimal totalDueAmount;
}