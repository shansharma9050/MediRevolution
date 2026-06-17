package com.example.medi.doctor.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookVideoAppointmentRequest {

    private Long doctorAuthUserId;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private String patientName;
    private String patientEmail;
    private String patientMobile;
    private String symptoms;
}