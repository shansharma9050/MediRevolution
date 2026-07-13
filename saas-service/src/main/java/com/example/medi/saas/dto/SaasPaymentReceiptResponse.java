package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasPaymentReceiptResponse {

    private Long id;

    private Long tenantId;

    private Long invoiceId;

    private String receiptNumber;

    private BigDecimal paidAmount;

    private String paymentMode;

    private String transactionId;

    private String remarks;

    private LocalDateTime receiptDateTime;
}