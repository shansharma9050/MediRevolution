package com.example.medi.saas.dto;

import com.example.medi.saas.enums.SaasAllergySeverity;
import com.example.medi.saas.enums.SaasAllergyStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SaasPatientAllergyRequest {

    private Long tenantId;

    private Long patientId;

    private String allergen;

    private String allergyType;

    private String reaction;

    private SaasAllergySeverity severity;

    private SaasAllergyStatus status;

    private LocalDate onsetDate;

    private String notes;
}