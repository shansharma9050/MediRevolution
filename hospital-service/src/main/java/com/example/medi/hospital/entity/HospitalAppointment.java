package com.example.medi.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.example.medi.hospital.enums.HospitalAppointmentStatus;

@Entity
@Table(
        name = "hospital_appointments",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {
                                "hospitalAuthUserId",
                                "doctorName",
                                "appointmentDate",
                                "appointmentTime"
                        }
                )
        }
)
@Data
@NoArgsConstructor
public class HospitalAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientAuthUserId;

    private Long hospitalAuthUserId;

    private String patientName;

    private String patientMobile;

    private String doctorName;

    private String department;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    @Column(length = 2000)
    private String symptoms;

    @Enumerated(EnumType.STRING)
    private HospitalAppointmentStatus status = HospitalAppointmentStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();

}