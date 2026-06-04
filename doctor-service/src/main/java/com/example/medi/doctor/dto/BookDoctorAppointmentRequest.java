package com.example.medi.doctor.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookDoctorAppointmentRequest {

    private Long doctorAuthUserId;

    private String patientName;

    private String patientMobile;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    private String symptoms;

}