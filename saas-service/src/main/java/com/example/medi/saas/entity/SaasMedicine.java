package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_medicines")
@Data
public class SaasMedicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant / workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 160)
    private String medicineName;

    @Column(length = 80)
    private String medicineType;

    @Column(length = 120)
    private String manufacturer;

    @Column(length = 80)
    private String saltName;

    @Column(length = 80)
    private String strength;

    @Column(length = 80)
    private String unit;

    private Integer reorderLevel = 10;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}