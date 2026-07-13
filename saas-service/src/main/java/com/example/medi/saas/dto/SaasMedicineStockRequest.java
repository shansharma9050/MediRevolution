package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SaasMedicineStockRequest {

    private Long tenantId;

    private Long medicineId;

    private String batchNumber;

    private LocalDate expiryDate;

    private Integer quantity;

    private BigDecimal purchasePrice;

    private BigDecimal salePrice;

    private String supplierName;
}