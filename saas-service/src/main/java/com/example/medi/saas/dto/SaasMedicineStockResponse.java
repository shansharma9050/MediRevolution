package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasMedicineStockResponse {

    private Long id;

    private Long tenantId;

    private Long medicineId;

    private String medicineName;

    private String medicineType;

    private String manufacturer;

    private String batchNumber;

    private LocalDate manufacturingDate;

    private LocalDate expiryDate;

    private Integer openingQuantity;

    private Integer currentQuantity;

    private BigDecimal purchasePrice;

    private BigDecimal salePrice;

    private BigDecimal mrp;

    private BigDecimal gstPercentage;

    private Long supplierId;

    private String supplierName;

    private Long lastPurchaseId;

    private Integer reorderLevel;

    private Boolean lowStock;

    private Boolean expired;

    private Boolean active;
}