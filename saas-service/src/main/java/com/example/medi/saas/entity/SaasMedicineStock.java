package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_medicine_stock")
@Data
public class SaasMedicineStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant / workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long medicineId;

    @Column(length = 100)
    private String batchNumber;

    private LocalDate expiryDate;

    private Integer openingQuantity = 0;

    private Integer currentQuantity = 0;

    private BigDecimal purchasePrice = BigDecimal.ZERO;

    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(length = 150)
    private String supplierName;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}