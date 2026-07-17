package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasSaleSummaryResponse {

    private Long totalSales;

    private BigDecimal totalSaleAmount;

    private BigDecimal totalPaidAmount;

    private BigDecimal totalDueAmount;

    private Long totalQuantitySold;
}