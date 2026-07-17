package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasExpirySearchRequest {

    private Long tenantId;

    private String keyword;

    private String expiryStatus;

    private Long supplierId;

    private Integer days;

    private Boolean includeZeroStock;
}