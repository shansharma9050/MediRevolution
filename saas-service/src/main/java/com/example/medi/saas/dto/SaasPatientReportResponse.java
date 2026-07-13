package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasPatientReportResponse {

    private Long patientId;

    private String patientCode;

    private String patientName;

    private String mobile;

    private String gender;

    private Integer age;

    private String city;

    private LocalDateTime createdAt;
}