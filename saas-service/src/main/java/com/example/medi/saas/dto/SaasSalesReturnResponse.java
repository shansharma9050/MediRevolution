package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasSalesReturnResponse {

	private Long id;

	private Long tenantId;

	private String returnNumber;

	private LocalDate returnDate;

	private Long saleId;

	private String saleNumber;

	private LocalDate saleDate;

	private Long customerId;

	private String customerCode;

	private String customerName;

	private String customerGstin;

	private String creditNoteNumber;

	private Integer totalQuantity;

	private BigDecimal grossAmount;

	private BigDecimal discountAmount;

	private BigDecimal taxableAmount;

	private BigDecimal gstAmount;

	private BigDecimal otherAdjustment;

	private BigDecimal roundOffAmount;

	private BigDecimal grandTotal;

	private BigDecimal refundedAmount;

	private BigDecimal pendingRefundAmount;

	private String refundStatus;

	private String returnStatus;

	private String remarks;

	private LocalDateTime createdAt;

	private List<SaasSalesReturnItemResponse> items;
}