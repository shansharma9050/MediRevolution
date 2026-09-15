package com.example.medi.saas.dto;

import com.example.medi.saas.enums.SaasAllergySeverity;
import com.example.medi.saas.enums.SaasAllergyStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaasPatientAllergyResponse {

    private Long id;

    private Long tenantId;

    private Long patientId;

    private String allergen;

    private String allergyType;

    private String reaction;

    private SaasAllergySeverity severity;

    private SaasAllergyStatus status;

    private LocalDate onsetDate;

    private String notes;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}