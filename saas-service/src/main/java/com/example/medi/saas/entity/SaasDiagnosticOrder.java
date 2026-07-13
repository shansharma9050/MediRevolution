package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasDiagnosticOrderStatus;
import com.example.medi.saas.enums.SaasDiagnosticType;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_diagnostic_orders")
@Data
public class SaasDiagnosticOrder {

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

    private Long doctorProfileId;

    private Long prescriptionId;

    private Long appointmentId;

    private Long invoiceId;

    @Column(length = 80)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasDiagnosticType diagnosticType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SaasDiagnosticOrderStatus status = SaasDiagnosticOrderStatus.ORDERED;

    private BigDecimal subtotal = BigDecimal.ZERO;

    private BigDecimal discountAmount = BigDecimal.ZERO;

    private BigDecimal taxAmount = BigDecimal.ZERO;

    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(length = 1000)
    private String clinicalNotes;

    @Column(length = 1000)
    private String resultSummary;

    @Column(length = 2000)
    private String resultDetails;

    @Column(length = 500)
    private String reportFileUrl;

    private LocalDateTime sampleCollectedAt;

    private LocalDateTime reportReadyAt;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime orderDateTime = LocalDateTime.now();

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}