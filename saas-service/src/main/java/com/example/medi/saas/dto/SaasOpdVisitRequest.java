package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasOpdVisitRequest {

    private Long tenantId;

    private Long patientId;

    private Long doctorProfileId;

    private Long appointmentId;

    private String symptoms;

    private String diagnosis;

    private String notes;

    private BigDecimal consultationFee;
}