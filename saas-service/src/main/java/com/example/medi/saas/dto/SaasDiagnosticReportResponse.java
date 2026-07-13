package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasDiagnosticReportResponse {

    private Long orderId;

    private String orderNumber;

    private String diagnosticType;

    private String patientName;

    private String doctorName;

    private BigDecimal totalAmount;

    private String status;

    private Long invoiceId;

    private LocalDateTime orderDateTime;
}