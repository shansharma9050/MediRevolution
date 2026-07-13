package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasMedicineResponse {

    private Long id;

    private Long tenantId;

    private String medicineName;

    private String medicineType;

    private String manufacturer;

    private String saltName;

    private String strength;

    private String unit;

    private Integer reorderLevel;

    private Boolean active;
}