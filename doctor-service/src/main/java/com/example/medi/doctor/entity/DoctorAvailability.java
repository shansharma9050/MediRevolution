package com.example.medi.doctor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "doctor_availability")
@Data
@NoArgsConstructor
public class DoctorAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long doctorAuthUserId;

    private LocalDate availableDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private Integer slotDuration; // 15, 20, 30 minutes

}