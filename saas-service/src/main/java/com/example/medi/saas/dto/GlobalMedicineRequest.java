package com.example.medi.saas.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class GlobalMedicineRequest {

    private String medicineName;

    private String brandName;

    private String composition;

    private String manufacturer;

    private String category;

    private String medicineType;

    private String description;

    private String imageUrl;
}