package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasSalesReturnAvailabilityResponse {

	private Long saleItemId;

	private Long saleStockAllocationId;

	private Long medicineId;

	private String medicineName;

	private String medicineType;

	private String manufacturer;

	private Long stockId;

	private String batchNumber;

	private LocalDate expiryDate;

	private Integer soldQuantity;

	private Integer previouslyReturnedQuantity;

	private Integer remainingReturnableQuantity;

	private BigDecimal saleRate;

	private BigDecimal discountPercentage;

	private BigDecimal gstPercentage;
}