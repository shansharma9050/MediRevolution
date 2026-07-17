package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GlobalMedicineResponse {

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