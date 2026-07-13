package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPaymentMode;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_payment_receipts")
@Data
public class SaasPaymentReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long invoiceId;

    @Column(length = 80)
    private String receiptNumber;

    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasPaymentMode paymentMode;

    @Column(length = 120)
    private String transactionId;

    @Column(length = 500)
    private String remarks;

    private Long createdByAuthUserId;

    private LocalDateTime receiptDateTime = LocalDateTime.now();

    private LocalDateTime createdAt = LocalDateTime.now();
}