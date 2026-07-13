package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasIpdDailyNoteRequest {

    private Long tenantId;

    private Long admissionId;

    private Long doctorProfileId;

    private String progressNote;

    private String treatmentPlan;

    private String vitals;
}