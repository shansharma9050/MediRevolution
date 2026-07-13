package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class SaasPatientRequest {

    private Long tenantId;

    private String patientName;

    private String mobile;

    private String email;

    private String gender;

    private LocalDate dateOfBirth;

    private Integer age;

    private String bloodGroup;

    private String address;

    private String city;

    private String state;

    private String pincode;

    private String emergencyContactName;

    private String emergencyContactMobile;

    private String allergies;

    private String existingDiseases;

    private String notes;
}