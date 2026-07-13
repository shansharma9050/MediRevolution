package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasOpdVisitResponse {

    private Long id;

    private Long tenantId;

    private String opdNumber;

    private Long patientId;

    private String patientName;

    private String patientMobile;

    private Long doctorProfileId;

    private String doctorName;

    private String department;

    private Long appointmentId;

    private LocalDateTime visitDateTime;

    private String symptoms;

    private String diagnosis;

    private String notes;

    private BigDecimal consultationFee;

    private String status;

    private Boolean active;

    private LocalDateTime createdAt;
}