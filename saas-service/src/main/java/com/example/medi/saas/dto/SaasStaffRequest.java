package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SaasStaffRequest {

    private Long tenantId;

    private Long authUserId;

    private String staffName;

    private String email;

    private String mobile;

    private String staffRole;

    private String password;

    private String department;

    private String designation;

    private String gender;

    private LocalDate dateOfBirth;

    private LocalDate joiningDate;

    private String address;

    private String city;

    private String state;

    private String pincode;

    private BigDecimal salary;

    private String emergencyContactName;

    private String emergencyContactMobile;

    /*
     * Doctor-specific fields.
     */
    private String qualification;

    private String specialization;

    private String registrationNumber;

    private Integer experienceYears;

    private BigDecimal consultationFee;

    private BigDecimal onlineConsultationFee;

    private Boolean onlineConsultationEnabled;
}