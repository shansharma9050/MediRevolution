package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SaasDiagnosticOrderRequest {

    private Long tenantId;

    private Long patientId;

    private Long doctorProfileId;

    private Long prescriptionId;

    private Long appointmentId;

    /*
     * LAB or RADIOLOGY
     */
    private String diagnosticType;

    private BigDecimal discountAmount;

    private BigDecimal taxAmount;

    private String clinicalNotes;

    private List<SaasDiagnosticOrderItemRequest> items;
}