package com.example.medi.medicine.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "medicines")
@Data
@NoArgsConstructor
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String medicineName;
    private String brandName;
    private String composition;
    private String manufacturer;
    private String category;
    private String medicineType;

    private String description;
    private String imageUrl;

    private boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();

   
}
