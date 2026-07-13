package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_doctor_profiles")
@Data
public class SaasDoctorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    /*
     * Link with SaaS staff table.
     * Doctor bhi staff hi hoga, but extra doctor fields yahan honge.
     */
    @Column(nullable = false)
    private Long staffId;

    private Long authUserId;

    @Column(nullable = false, length = 120)
    private String doctorName;

    @Column(length = 120)
    private String department;

    @Column(length = 120)
    private String specialization;

    @Column(length = 120)
    private String qualification;

    private Integer experienceYears;

    @Column(length = 80)
    private String registrationNumber;

    @Column(length = 120)
    private String medicalCouncil;

    private BigDecimal consultationFee;

    private BigDecimal onlineConsultationFee;

    private Boolean onlineConsultationAllowed = false;

    private Boolean opdAllowed = true;

    private Boolean ipdAllowed = false;

    @Column(length = 500)
    private String bio;

    @Column(length = 500)
    private String signatureUrl;

    private Boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}