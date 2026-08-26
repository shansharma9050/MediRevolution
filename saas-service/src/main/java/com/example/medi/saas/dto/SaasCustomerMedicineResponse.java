package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasCustomerMedicineResponse {
	private Long medicineId;
	private String medicineName;
	private String medicineType;
	private String manufacturer;
	private Integer availableQuantity;
	private BigDecimal unitPrice;
	private BigDecimal gstPercentage;
}
