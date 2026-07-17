package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasPurchaseReturnItemResponse {

    private Long id;

    private Long purchaseItemId;

    private Long medicineId;

    private String medicineName;

    private Long stockId;

    private String batchNumber;

    private LocalDate expiryDate;

    private Integer returnQuantity;

    private BigDecimal purchaseRate;

    private BigDecimal grossAmount;

    private BigDecimal discountPercentage;

    private BigDecimal discountAmount;

    private BigDecimal taxableAmount;

    private BigDecimal gstPercentage;

    private BigDecimal gstAmount;

    private BigDecimal lineTotal;

    private String returnReason;

    private String reasonDetails;
}