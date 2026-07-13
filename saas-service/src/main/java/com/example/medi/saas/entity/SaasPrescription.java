package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_prescriptions")
@Data
public class SaasPrescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant / SaaS workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorProfileId;

    /*
     * Optional, but recommended.
     * Agar prescription kisi appointment se linked hai to appointmentId save hoga.
     */
    private Long appointmentId;

    @Column(length = 500)
    private String diagnosis;

    @Column(length = 1000)
    private String clinicalNotes;

    @Column(length = 1000)
    private String advice;

    @Column(length = 1000)
    private String labTests;

    @Column(length = 1000)
    private String followUpAdvice;

    private LocalDate followUpDate;

    /*
     * Vitals
     */
    @Column(length = 30)
    private String bloodPressure;

    @Column(length = 30)
    private String pulse;

    @Column(length = 30)
    private String temperature;

    @Column(length = 30)
    private String spo2;

    @Column(length = 30)
    private String weight;

    @Column(length = 30)
    private String height;

    @Column(length = 30)
    private String sugarLevel;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}