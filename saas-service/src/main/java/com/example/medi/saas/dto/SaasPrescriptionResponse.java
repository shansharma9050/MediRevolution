package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasPrescriptionResponse {

    private Long id;

    private Long tenantId;

    private Long patientId;

    private String patientCode;

    private String patientName;

    private String patientMobile;

    private Long doctorProfileId;

    private String doctorName;

    private String department;

    private String specialization;

    private Long appointmentId;

    private String diagnosis;

    private String clinicalNotes;

    private String advice;

    private String labTests;

    private String followUpAdvice;

    private LocalDate followUpDate;

    private String bloodPressure;

    private String pulse;

    private String temperature;

    private String spo2;

    private String weight;

    private String height;

    private String sugarLevel;

    private List<SaasPrescriptionMedicineResponse> medicines;

    private Boolean active;

    private LocalDateTime createdAt;
}