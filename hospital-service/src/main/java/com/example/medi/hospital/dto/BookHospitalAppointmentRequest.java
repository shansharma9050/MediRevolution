package com.example.medi.hospital.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.example.medi.hospital.enums.HospitalConsultationType;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
    
    private String patientEmail;

    private String patientMobile;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    private String symptoms;
    
    @Enumerated(EnumType.STRING)
    private HospitalConsultationType consultationType;

}