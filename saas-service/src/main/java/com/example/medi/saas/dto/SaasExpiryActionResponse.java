package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasExpiryActionResponse {

    private Long id;

    private Long tenantId;

    private String actionNumber;

    private LocalDate actionDate;

    private String actionType;

    private String actionStatus;

    private Long stockId;

    private Long medicineId;

    private String medicineName;

    private String batchNumber;

    private LocalDate expiryDate;

    private Long supplierId;

    private String supplierCode;

    private String supplierName;

    private Long purchaseId;

    private String purchaseNumber;

    private Long purchaseItemId;

    private Integer quantityBefore;

    private Integer actionQuantity;

    private Integer quantityAfter;

    private BigDecimal purchaseRate;

    private BigDecimal stockValue;

    private String disposalMethod;

    private String adjustmentReason;

    private Long purchaseReturnId;

    private String purchaseReturnNumber;

    private String referenceNumber;

    private String authorizedBy;

    private String witnessName;

    private String disposalLocation;

    private String reasonDetails;

    private String remarks;

    private LocalDateTime createdAt;
}