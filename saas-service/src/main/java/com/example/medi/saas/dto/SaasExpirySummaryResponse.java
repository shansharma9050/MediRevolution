package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasExpirySummaryResponse {

	private Long totalTrackedBatches;

	private Long expiredBatches;

	private Long expiresTodayBatches;

	private Long criticalBatches;

	private Long nearExpiryBatches;

	private Integer expiredQuantity;

	private Integer nearExpiryQuantity;

	private BigDecimal expiredStockValue;

	private BigDecimal nearExpiryStockValue;

	private BigDecimal totalStockValueAtRisk;

	private Long suppliersAffected;

	private Long pendingActionBatches;
}