package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class SaasPrescriptionRequest {

    private Long tenantId;

    private Long patientId;

    private Long doctorProfileId;

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

    private List<SaasPrescriptionMedicineRequest> medicines;
}