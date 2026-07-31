package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "saas_wholesaler_invoice_items")
@Data
@NoArgsConstructor
public class SaasWholesalerInvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tenantId;

    private Long invoiceId;

    private Long medicineId;

    private String medicineName;

    private String batchNumber;

    private Integer quantity;

    @Column(precision = 18, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 18, scale = 2)
    private BigDecimal discountPercentage;

    @Column(precision = 18, scale = 2)
    private BigDecimal discountAmount;

    @Column(precision = 18, scale = 2)
    private BigDecimal gstPercentage;

    @Column(precision = 18, scale = 2)
    private BigDecimal gstAmount;

    @Column(precision = 18, scale = 2)
    private BigDecimal totalPrice;

}