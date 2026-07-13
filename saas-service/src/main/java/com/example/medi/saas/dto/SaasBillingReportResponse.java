package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasBillingReportResponse {

    private Long invoiceId;

    private String invoiceNumber;

    private String invoiceType;

    private String patientName;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal dueAmount;

    private String paymentStatus;

    private String paymentMode;

    private LocalDateTime invoiceDateTime;
}