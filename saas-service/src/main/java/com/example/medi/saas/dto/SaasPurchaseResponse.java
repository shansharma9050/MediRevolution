package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasPurchaseResponse {

    private Long id;

    private Long tenantId;

    private String purchaseNumber;

    private LocalDate purchaseDate;

    private Long supplierId;

    private String supplierCode;

    private String supplierName;

    private String supplierInvoiceNumber;

    private LocalDate supplierInvoiceDate;

    private Integer totalQuantity;

    private Integer totalFreeQuantity;

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

    private String purchaseStatus;

    private String remarks;

    private LocalDateTime createdAt;

    private List<SaasPurchaseItemResponse> items;
}