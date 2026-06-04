package com.example.medi.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "hospital_doctor_availability")
@Data
@NoArgsConstructor
public class HospitalDoctorAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long hospitalAuthUserId;

    private String doctorName;

    private String department;

    private LocalDate availableDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private Integer slotDuration;

}