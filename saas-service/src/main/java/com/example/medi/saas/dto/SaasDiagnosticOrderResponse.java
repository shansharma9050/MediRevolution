package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasDiagnosticOrderResponse {

    private Long id;

    private Long tenantId;

    private String orderNumber;

    private String diagnosticType;

    private Long patientId;

    private String patientName;

    private String patientMobile;

    private Long doctorProfileId;

    private String doctorName;

    private String department;

    private Long prescriptionId;

    private Long appointmentId;

    private Long invoiceId;

    private BigDecimal subtotal;

    private BigDecimal discountAmount;

    private BigDecimal taxAmount;

    private BigDecimal totalAmount;

    private String status;

    private String clinicalNotes;

    private String resultSummary;

    private String resultDetails;

    private String reportFileUrl;

    private LocalDateTime sampleCollectedAt;

    private LocalDateTime reportReadyAt;

    private LocalDateTime orderDateTime;

    private List<SaasDiagnosticOrderItemResponse> items;
}