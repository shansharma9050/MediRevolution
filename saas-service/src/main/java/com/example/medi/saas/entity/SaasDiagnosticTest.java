package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasDiagnosticType;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_diagnostic_tests")
@Data
public class SaasDiagnosticTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant / workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasDiagnosticType diagnosticType;

    @Column(nullable = false, length = 160)
    private String testName;

    @Column(length = 80)
    private String testCode;

    @Column(length = 120)
    private String category;

    @Column(length = 500)
    private String description;

    private BigDecimal price = BigDecimal.ZERO;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}