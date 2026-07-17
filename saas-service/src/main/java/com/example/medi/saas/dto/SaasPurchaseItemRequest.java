package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SaasPurchaseItemRequest {

    private Long medicineId;

    private String batchNumber;

    private LocalDate manufacturingDate;

    private LocalDate expiryDate;

    private Integer quantity;

    private Integer freeQuantity;

    private BigDecimal purchaseRate;

    private BigDecimal saleRate;

    private BigDecimal mrp;

    private BigDecimal discountPercentage;

    private BigDecimal gstPercentage;
}