package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasExpiryBatchResponse {

    private Long stockId;

    private Long medicineId;

    private String medicineName;

    private String medicineType;

    private String manufacturer;

    private String batchNumber;

    private LocalDate expiryDate;

    private Long daysToExpiry;

    private String expiryStatus;

    private Integer currentQuantity;

    private Integer quarantinedQuantity;

    private Integer availableQuantity;

    private BigDecimal purchaseRate;

    private BigDecimal saleRate;

    private BigDecimal stockValueAtRisk;

    private Long supplierId;

    private String supplierCode;

    private String supplierName;

    private Long purchaseId;

    private String purchaseNumber;

    private Long purchaseItemId;

    private Boolean returnToSupplierAvailable;

    private Boolean actionRequired;
}