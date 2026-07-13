package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasOpdStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_opd_visits")
@Data
public class SaasOpdVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant / workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorProfileId;

    /*
     * Optional appointment link.
     */
    private Long appointmentId;

    @Column(length = 80)
    private String opdNumber;

    @Column(nullable = false)
    private LocalDateTime visitDateTime = LocalDateTime.now();

    @Column(length = 500)
    private String symptoms;

    @Column(length = 500)
    private String diagnosis;

    @Column(length = 500)
    private String notes;

    private BigDecimal consultationFee = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasOpdStatus status = SaasOpdStatus.OPEN;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}