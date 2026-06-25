package com.example.medi.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_doctors")
@Data
@NoArgsConstructor
public class HospitalDoctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long hospitalAuthUserId;

    private String doctorName;
    private String specialization;
    private String department;
    private String qualification;
    private Integer experienceYears;
    private String mobile;
    private String email;
    private Long consultationFee;
    private Boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();

}