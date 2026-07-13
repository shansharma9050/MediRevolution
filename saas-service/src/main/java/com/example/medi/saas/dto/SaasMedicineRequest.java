package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasMedicineRequest {

    private Long tenantId;

    private String medicineName;

    private String medicineType;

    private String manufacturer;

    private String saltName;

    private String strength;

    private String unit;

    private Integer reorderLevel;
}