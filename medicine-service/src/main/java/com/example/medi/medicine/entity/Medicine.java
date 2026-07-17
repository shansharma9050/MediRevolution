package com.example.medi.medicine.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "medicines",
        indexes = {
                @Index(
                        name = "idx_medicines_name",
                        columnList = "medicineName"
                ),
                @Index(
                        name = "idx_medicines_brand",
                        columnList = "brandName"
                ),
                @Index(
                        name = "idx_medicines_manufacturer",
                        columnList = "manufacturer"
                )
        }
)
@Data
@NoArgsConstructor
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String medicineName;

    @Column(nullable = false, length = 180)
    private String brandName;

    @Column(nullable = false, length = 500)
    private String composition;

    @Column(nullable = false, length = 180)
    private String manufacturer;

    @Column(nullable = false, length = 120)
    private String category;

    @Column(nullable = false, length = 120)
    private String medicineType;

    @Column(length = 1000)
    private String description;

    @Column(length = 1000)
    private String imageUrl;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}