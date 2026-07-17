package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasSupplierExpiryResponse {

    private Long supplierId;

    private String supplierCode;

    private String supplierName;

    private Long affectedBatchCount;

    private Long expiredBatchCount;

    private Long nearExpiryBatchCount;

    private Integer affectedQuantity;

    private BigDecimal stockValueAtRisk;

    private Boolean returnToSupplierAvailable;
}