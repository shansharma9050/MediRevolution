package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasDoctorRequest {

    private Long tenantId;

    /*
     * Existing staff ko doctor profile banana ho to staffId bhejo.
     * New doctor create karna ho to staffName/mobile/email bhejo.
     */
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
}