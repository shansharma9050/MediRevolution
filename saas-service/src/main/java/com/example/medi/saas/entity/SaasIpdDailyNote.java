package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_ipd_daily_notes")
@Data
public class SaasIpdDailyNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long admissionId;

    @Column(nullable = false)
    private Long doctorProfileId;

    @Column(nullable = false)
    private LocalDateTime noteDateTime = LocalDateTime.now();

    @Column(length = 1000)
    private String progressNote;

    @Column(length = 1000)
    private String treatmentPlan;

    @Column(length = 500)
    private String vitals;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();
}