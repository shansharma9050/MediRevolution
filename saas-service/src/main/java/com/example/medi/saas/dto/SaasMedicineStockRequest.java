package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SaasMedicineStockRequest {

	private Long tenantId;

	private Long medicineId;

	private String batchNumber;

	private LocalDate manufacturingDate;

	private LocalDate expiryDate;

	private Integer quantity;

	private BigDecimal purchasePrice;

	private BigDecimal salePrice;

	private BigDecimal mrp;

	private BigDecimal gstPercentage;

	private Long supplierId;

	private String supplierName;
}