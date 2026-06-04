package com.example.medi.doctor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.example.medi.doctor.enums.AppointmentStatus;

@Entity
@Table(name = "appointments",

uniqueConstraints = {
        @UniqueConstraint(
                columnNames = {
                        "doctorAuthUserId",
                        "appointmentDate",
                        "appointmentTime"
                }
        )
})
@Data
@NoArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientAuthUserId;

    private Long doctorAuthUserId;

    private String patientName;

    private String patientMobile;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    @Column(length = 2000)
    private String symptoms;

    @Enumerated(EnumType.STRING)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    private String meetingUrl;

    private LocalDateTime createdAt = LocalDateTime.now();
    
}