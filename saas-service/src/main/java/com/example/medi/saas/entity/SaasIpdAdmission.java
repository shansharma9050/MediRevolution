package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasIpdStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_ipd_admissions")
@Data
public class SaasIpdAdmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorProfileId;

    @Column(nullable = false)
    private Long wardId;

    @Column(nullable = false)
    private Long bedId;

    @Column(length = 80)
    private String ipdNumber;

    @Column(nullable = false)
    private LocalDateTime admissionDateTime = LocalDateTime.now();

    private LocalDateTime dischargeDateTime;

    @Column(length = 500)
    private String reasonForAdmission;

    @Column(length = 500)
    private String provisionalDiagnosis;

    @Column(length = 1000)
    private String dischargeSummary;

    @Column(length = 500)
    private String dischargeAdvice;

    private BigDecimal advanceAmount = BigDecimal.ZERO;

    private BigDecimal totalCharges = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasIpdStatus status = SaasIpdStatus.ADMITTED;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}