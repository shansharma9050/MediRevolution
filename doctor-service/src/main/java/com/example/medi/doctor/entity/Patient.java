package com.example.medi.doctor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctor_patients")
@Data
@NoArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long doctorAuthUserId;

    private String patientName;
    private String mobile;
    private String email;
    private String gender;
    private LocalDate dateOfBirth;
    private String bloodGroup;

    @Column(length = 2000)
    private String address;

    @Column(length = 3000)
    private String medicalHistory;

    private LocalDateTime createdAt = LocalDateTime.now();

}