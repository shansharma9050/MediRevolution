package com.example.medi.hospital.entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

import com.example.medi.hospital.enums.PatientType;

@Entity
@Table(name = "hospital_patients")
@Data
@NoArgsConstructor
public class HospitalPatient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long hospitalAuthUserId;

    private String patientName;
    private String mobile;
    private String gender;

    private Integer age;

    @Enumerated(EnumType.STRING)
    private PatientType patientType;

    private String department;

    private String doctorName;

    private LocalDate admissionDate;

    private LocalDate dischargeDate;

    @Column(length = 3000)
    private String diagnosis;

}
