package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPaymentMode;
import com.example.medi.saas.enums.SaasPaymentStatus;
import com.example.medi.saas.enums.SaasPharmacySaleStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_pharmacy_sales")
@Data
public class SaasPharmacySale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long patientId;

    private Long invoiceId;

    @Column(length = 80)
    private String saleNumber;

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasPharmacySaleStatus status = SaasPharmacySaleStatus.COMPLETED;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime saleDateTime = LocalDateTime.now();

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}