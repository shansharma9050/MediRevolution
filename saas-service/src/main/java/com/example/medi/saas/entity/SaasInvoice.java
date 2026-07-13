package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasInvoiceType;
import com.example.medi.saas.enums.SaasPaymentMode;
import com.example.medi.saas.enums.SaasPaymentStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_invoices")
@Data
public class SaasInvoice {

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

    private Long opdVisitId;

    private Long ipdAdmissionId;

    @Column(length = 80)
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasInvoiceType invoiceType;

    private BigDecimal subtotal = BigDecimal.ZERO;

    private BigDecimal discountAmount = BigDecimal.ZERO;

    private BigDecimal taxAmount = BigDecimal.ZERO;

    private BigDecimal totalAmount = BigDecimal.ZERO;

    private BigDecimal paidAmount = BigDecimal.ZERO;

    private BigDecimal dueAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasPaymentStatus paymentStatus = SaasPaymentStatus.UNPAID;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SaasPaymentMode paymentMode;

    @Column(length = 120)
    private String transactionId;

    @Column(length = 500)
    private String notes;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime invoiceDateTime = LocalDateTime.now();

    private LocalDateTime paymentDateTime;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}