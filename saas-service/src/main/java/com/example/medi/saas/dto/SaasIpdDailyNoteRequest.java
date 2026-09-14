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

    private String bloodPressure;

    private String pulse;

    private String temperature;

    private String spo2;

    private String weight;

    private String height;

    private String sugarLevel;
}
