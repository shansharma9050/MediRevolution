package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasSaleResponse {

    private Long id;

    private Long tenantId;

    private String saleNumber;

    private LocalDate saleDate;

    private Long customerId;

    private String customerCode;

    private String customerName;

    private String customerType;

    private String customerGstin;

    private Integer totalQuantity;

    private BigDecimal grossAmount;

    private BigDecimal discountAmount;

    private BigDecimal taxableAmount;

    private BigDecimal gstAmount;

    private BigDecimal otherCharges;

    private BigDecimal roundOffAmount;

    private BigDecimal grandTotal;

    private BigDecimal paidAmount;

    private BigDecimal dueAmount;

    private String paymentStatus;

    private String saleStatus;

    private String remarks;

    private LocalDateTime createdAt;

    private List<SaasSaleItemResponse> items;
}