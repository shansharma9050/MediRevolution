package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@AllArgsConstructor
public class SaasAppointmentReportResponse {

    private Long appointmentId;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    private String patientName;

    private String doctorName;

    private String department;

    private String appointmentType;

    private String status;
}