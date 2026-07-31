package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPaymentMode;
import com.example.medi.saas.enums.SaasPaymentStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_wholesaler_invoices")
@Data
@NoArgsConstructor
public class SaasWholesalerInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tenantId;

    private String invoiceNumber;

    private Long customerId;

    private String customerName;

    private String customerMobile;

    private String customerGstin;

    @Column(precision = 18, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    private BigDecimal dueAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private SaasPaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    private SaasPaymentMode paymentMode;

    private String transactionId;

    @Column(length = 2000)
    private String notes;

    private Long createdByAuthUserId;

    private Boolean active = true;

    private LocalDateTime invoiceDateTime;

    private LocalDateTime paymentDateTime;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (invoiceDateTime == null) {
            invoiceDateTime = LocalDateTime.now();
        }

        if (active == null) {
            active = true;
        }

        if (subtotal == null) subtotal = BigDecimal.ZERO;
        if (discountAmount == null) discountAmount = BigDecimal.ZERO;
        if (gstAmount == null) gstAmount = BigDecimal.ZERO;
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;
        if (paidAmount == null) paidAmount = BigDecimal.ZERO;
        if (dueAmount == null) dueAmount = BigDecimal.ZERO;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void touch() {
        updatedAt = LocalDateTime.now();
    }

}