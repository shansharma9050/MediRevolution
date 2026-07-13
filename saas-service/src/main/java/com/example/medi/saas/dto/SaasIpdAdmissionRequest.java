package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasIpdAdmissionRequest {

    private Long tenantId;

    private Long patientId;

    private Long doctorProfileId;

    private Long wardId;

    private Long bedId;

    private String reasonForAdmission;

    private String provisionalDiagnosis;

    private BigDecimal advanceAmount;
}