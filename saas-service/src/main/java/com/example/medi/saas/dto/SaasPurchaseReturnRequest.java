package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class SaasPurchaseReturnRequest {

    private Long tenantId;

    private Long purchaseId;

    private LocalDate returnDate;

    private String debitNoteNumber;

    private BigDecimal otherCharges;

    private BigDecimal roundOffAmount;

    private String remarks;

    private List<SaasPurchaseReturnItemRequest> items;
}