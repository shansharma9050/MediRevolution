package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "saas_prescription_medicines")
@Data
public class SaasPrescriptionMedicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant isolation for safety.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long prescriptionId;

    @Column(nullable = false, length = 150)
    private String medicineName;

    @Column(length = 80)
    private String dosage;

    @Column(length = 80)
    private String frequency;

    @Column(length = 80)
    private String duration;

    @Column(length = 300)
    private String instructions;
}