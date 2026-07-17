package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasPaymentSummaryResponse {

    private Long totalTransactions;

    private BigDecimal totalSupplierPayments;

    private BigDecimal totalCustomerReceipts;

    private BigDecimal totalSupplierOutstanding;

    private BigDecimal totalCustomerOutstanding;
}