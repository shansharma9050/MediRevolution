package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "saas_pharmacy_sale_items")
@Data
public class SaasPharmacySaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long saleId;

    @Column(nullable = false)
    private Long medicineId;

    @Column(nullable = false)
    private Long stockId;

    @Column(nullable = false, length = 160)
    private String medicineName;

    @Column(length = 100)
    private String batchNumber;

    private Integer quantity = 1;

    private BigDecimal salePrice = BigDecimal.ZERO;

    private BigDecimal totalPrice = BigDecimal.ZERO;
}