package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasInvoiceResponse {

    private Long id;

    private Long tenantId;

    private String invoiceNumber;

    private String invoiceType;

    private Long patientId;

    private String patientName;

    private String patientMobile;

    private Long doctorProfileId;

    private String doctorName;

    private String department;

    private Long opdVisitId;

    private Long ipdAdmissionId;

    private String ipdNumber;

    private BigDecimal subtotal;

    private BigDecimal discountAmount;

    private BigDecimal taxAmount;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal dueAmount;

    private String paymentStatus;

    private String paymentMode;

    private String transactionId;

    private String notes;

    private LocalDateTime invoiceDateTime;

    private LocalDateTime paymentDateTime;

    private List<SaasInvoiceItemResponse> items;
}