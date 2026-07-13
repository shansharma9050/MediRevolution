package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasIpdChargeType;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_ipd_charges")
@Data
public class SaasIpdCharge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long admissionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SaasIpdChargeType chargeType;

    @Column(nullable = false, length = 150)
    private String description;

    private BigDecimal amount = BigDecimal.ZERO;

    private LocalDateTime chargeDateTime = LocalDateTime.now();

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();
}