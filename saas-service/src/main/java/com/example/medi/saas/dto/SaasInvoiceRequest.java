package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SaasInvoiceRequest {

    private Long tenantId;

    private Long patientId;

    private Long doctorProfileId;

    private Long opdVisitId;

    private Long ipdAdmissionId;

    private String invoiceType;

    private BigDecimal discountAmount;

    private BigDecimal taxAmount;

    private BigDecimal paidAmount;

    private String paymentMode;

    private String transactionId;

    private String notes;

    private List<SaasInvoiceItemRequest> items;
}