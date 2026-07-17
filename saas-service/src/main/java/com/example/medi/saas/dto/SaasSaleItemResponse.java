package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasSaleItemResponse {

	private Long id;

	private Long medicineId;

	private String medicineName;

	private String medicineType;

	private String manufacturer;

	private Integer quantity;

	private BigDecimal saleRate;

	private BigDecimal grossAmount;

	private BigDecimal discountPercentage;

	private BigDecimal discountAmount;

	private BigDecimal taxableAmount;

	private BigDecimal gstPercentage;

	private BigDecimal gstAmount;

	private BigDecimal lineTotal;

	private List<SaasSaleStockAllocationResponse> allocations;
}