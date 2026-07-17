package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasPurchaseReturnAvailabilityResponse {

    private Long purchaseItemId;

    private Long medicineId;

    private String medicineName;

    private String medicineType;

    private String manufacturer;

    private Long stockId;

    private String batchNumber;

    private LocalDate expiryDate;

    private Integer purchasedQuantity;

    private Integer freeQuantity;

    private Integer totalReceivedQuantity;

    private Integer previouslyReturnedQuantity;

    private Integer remainingReturnableQuantity;

    private Integer currentStockQuantity;

    private Integer maximumReturnQuantity;

    private BigDecimal purchaseRate;

    private BigDecimal discountPercentage;

    private BigDecimal gstPercentage;
}