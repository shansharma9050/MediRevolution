package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasStockMovementType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_stock_movements")
@Data
public class SaasStockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long medicineId;

    private Long stockId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SaasStockMovementType movementType;

    private Integer quantity;

    @Column(length = 500)
    private String remarks;

    private Long referenceId;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();
}