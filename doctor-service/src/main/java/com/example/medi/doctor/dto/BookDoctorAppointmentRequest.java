package com.example.medi.doctor.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.example.medi.doctor.enums.ConsultationType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookDoctorAppointmentRequest {

    private Long doctorAuthUserId;
    
    private ConsultationType consultationType;

    private String patientName;
    
    private String patientEmail;

    private String patientMobile;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    private String symptoms;

}