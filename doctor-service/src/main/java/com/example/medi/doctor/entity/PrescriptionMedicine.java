package com.example.medi.doctor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "prescription_medicines")
@Data
@NoArgsConstructor
public class PrescriptionMedicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String medicineName;
    private String dosage;
    private String frequency;
    private String duration;
    private String instructions;

    @ManyToOne
    @JoinColumn(name = "prescription_id")
    private Prescription prescription;

}