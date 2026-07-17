package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class SaasPurchaseRequest {

    private Long tenantId;

    private LocalDate purchaseDate;

    private Long supplierId;

    private String supplierInvoiceNumber;

    private LocalDate supplierInvoiceDate;

    private BigDecimal otherCharges;

    private BigDecimal roundOffAmount;

    private BigDecimal paidAmount;

    private String remarks;

    private List<SaasPurchaseItemRequest> items;
}