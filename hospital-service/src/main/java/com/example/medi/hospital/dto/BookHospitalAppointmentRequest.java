package com.example.medi.hospital.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookHospitalAppointmentRequest {

    private Long hospitalAuthUserId;
    
    private Long hospitalDoctorId;

    private String doctorName;

    private String department;

    private String patientName;

    private String patientMobile;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    private String symptoms;

}