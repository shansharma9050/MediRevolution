package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasPharmacyReportResponse {

    private Long saleId;

    private String saleNumber;

    private String patientName;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal dueAmount;

    private String paymentStatus;

    private LocalDateTime saleDateTime;
}