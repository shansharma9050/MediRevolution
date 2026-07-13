package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "saas_invoice_items")
@Data
public class SaasInvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant isolation for safety.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long invoiceId;

    @Column(nullable = false, length = 160)
    private String itemName;

    @Column(length = 80)
    private String itemType;

    private Integer quantity = 1;

    private BigDecimal unitPrice = BigDecimal.ZERO;

    private BigDecimal totalPrice = BigDecimal.ZERO;
}