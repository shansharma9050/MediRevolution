package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasIpdAdmissionResponse {

    private Long id;

    private Long tenantId;

    private String ipdNumber;

    private Long patientId;

    private String patientName;

    private String patientMobile;

    private Long doctorProfileId;

    private String doctorName;

    private String department;

    private Long wardId;

    private String wardName;

    private Long bedId;

    private String bedNumber;

    private LocalDateTime admissionDateTime;

    private LocalDateTime dischargeDateTime;

    private String reasonForAdmission;

    private String provisionalDiagnosis;

    private String dischargeSummary;

    private String dischargeAdvice;

    private BigDecimal advanceAmount;

    private BigDecimal totalCharges;

    private String status;

    private Boolean active;

    private LocalDateTime createdAt;
}