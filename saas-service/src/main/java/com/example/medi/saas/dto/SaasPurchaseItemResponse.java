package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasPurchaseItemResponse {

    private Long id;

    private Long medicineId;

    private String medicineName;

    private String medicineType;

    private String manufacturer;

    private String batchNumber;

    private LocalDate manufacturingDate;

    private LocalDate expiryDate;

    private Integer quantity;

    private Integer freeQuantity;

    private BigDecimal purchaseRate;

    private BigDecimal saleRate;

    private BigDecimal mrp;

    private BigDecimal grossAmount;

    private BigDecimal discountPercentage;

    private BigDecimal discountAmount;

    private BigDecimal taxableAmount;

    private BigDecimal gstPercentage;

    private BigDecimal gstAmount;

    private BigDecimal lineTotal;
}