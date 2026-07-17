package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasInventorySummaryResponse {

    private Long totalMedicines;

    private Long totalBatches;

    private Long totalAvailableQuantity;

    private Long lowStockBatches;

    private Long expiredBatches;

    private Long nearExpiryBatches;

    private BigDecimal totalPurchaseValue;

    private BigDecimal totalSaleValue;
}