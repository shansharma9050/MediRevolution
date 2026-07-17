package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasExpiryConfigurationRequest {

    private Long tenantId;

    private Integer nearExpiryDays;

    private Integer criticalExpiryDays;

    private Boolean alertEnabled;

    private Boolean dailyAlertEnabled;

    private Boolean includeZeroStockBatches;

    private Boolean autoQuarantineExpiredStock;
}