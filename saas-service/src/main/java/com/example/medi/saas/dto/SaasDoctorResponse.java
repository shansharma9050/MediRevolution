package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasDoctorResponse {

    private Long id;

    private Long tenantId;

    private Long staffId;

    private Long authUserId;

    private String doctorName;

    private String email;

    private String mobile;

    private String department;

    private String specialization;

    private String qualification;

    private Integer experienceYears;

    private String registrationNumber;

    private String medicalCouncil;

    private BigDecimal consultationFee;

    private BigDecimal onlineConsultationFee;

    private Boolean onlineConsultationAllowed;

    private Boolean opdAllowed;

    private Boolean ipdAllowed;

    private String bio;

    private Boolean active;

    private LocalDateTime createdAt;
}