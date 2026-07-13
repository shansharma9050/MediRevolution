package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaasStaffResponse {

    private Long id;

    private Long tenantId;

    private Long authUserId;

    private String staffCode;

    private String staffName;

    private String email;

    private String mobile;

    private String staffRole;

    private String status;

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

    private String qualification;

    private String specialization;

    private String registrationNumber;

    private Integer experienceYears;

    private BigDecimal consultationFee;

    private BigDecimal onlineConsultationFee;

    private Boolean onlineConsultationEnabled;

    private Boolean active;

    private LocalDateTime createdAt;
}