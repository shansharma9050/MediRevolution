package com.example.medi.doctor.entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long doctorAuthUserId;

    private String patientName;
    private String patientMobile;
    private Integer patientAge;
    private String gender;

    @Column(length = 2000)
    private String diagnosis;

    @Column(length = 3000)
    private String advice;

    private LocalDateTime prescriptionDate = LocalDateTime.now();

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PrescriptionMedicine> medicines = new ArrayList<>();

   
}