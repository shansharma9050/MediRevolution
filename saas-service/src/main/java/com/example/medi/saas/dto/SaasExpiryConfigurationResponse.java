package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasExpiryConfigurationResponse {

	private Long id;

	private Long tenantId;

	private Integer nearExpiryDays;

	private Integer criticalExpiryDays;

	private Boolean alertEnabled;

	private Boolean dailyAlertEnabled;

	private Boolean includeZeroStockBatches;

	private Boolean autoQuarantineExpiredStock;

	private LocalDateTime createdAt;

	private LocalDateTime updatedAt;
}