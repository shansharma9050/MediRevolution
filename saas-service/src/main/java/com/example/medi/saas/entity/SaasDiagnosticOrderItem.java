package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "saas_diagnostic_order_items")
@Data
public class SaasDiagnosticOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant isolation for safety.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false)
    private Long testId;

    @Column(nullable = false, length = 160)
    private String testName;

    @Column(length = 80)
    private String testCode;

    private BigDecimal price = BigDecimal.ZERO;
}