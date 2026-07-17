package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class SaasSalesReturnRequest {

    private Long tenantId;

    private Long saleId;

    private LocalDate returnDate;

    private String creditNoteNumber;

    private BigDecimal otherAdjustment;

    private BigDecimal roundOffAmount;

    private BigDecimal refundedAmount;

    private Boolean adjustInCustomerAccount;

    private String remarks;

    private List<SaasSalesReturnItemRequest> items;
}