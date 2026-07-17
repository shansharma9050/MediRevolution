package com.example.medi.medicine.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class MedicineResponse {

    private Long id;

    private String medicineName;

    private String brandName;

    private String composition;

    private String manufacturer;

    private String category;

    private String medicineType;

    private String description;

    private String imageUrl;

    private boolean active;

    private LocalDateTime createdAt;
}