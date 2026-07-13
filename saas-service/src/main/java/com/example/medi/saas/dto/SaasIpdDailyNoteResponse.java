package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasIpdDailyNoteResponse {

    private Long id;

    private Long tenantId;

    private Long admissionId;

    private Long doctorProfileId;

    private String doctorName;

    private LocalDateTime noteDateTime;

    private String progressNote;

    private String treatmentPlan;

    private String vitals;
}