package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasPurchaseReturnResponse {

    private Long id;

    private Long tenantId;

    private String returnNumber;

    private LocalDate returnDate;

    private Long purchaseId;

    private String purchaseNumber;

    private String supplierInvoiceNumber;

    private Long supplierId;

    private String supplierCode;

    private String supplierName;

    private Integer totalQuantity;

    private BigDecimal grossAmount;

    private BigDecimal discountAmount;

    private BigDecimal taxableAmount;

    private BigDecimal gstAmount;

    private BigDecimal otherCharges;

    private BigDecimal roundOffAmount;

    private BigDecimal grandTotal;

    private String returnStatus;

    private String debitNoteNumber;

    private String remarks;

    private LocalDateTime createdAt;

    private List<SaasPurchaseReturnItemResponse> items;
}