package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class SaasSaleRequest {

	private Long tenantId;

	private LocalDate saleDate;

	private Long customerId;

	private BigDecimal otherCharges;

	private BigDecimal roundOffAmount;

	private BigDecimal paidAmount;

	private String remarks;

	private List<SaasSaleItemRequest> items;
}