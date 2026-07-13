package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasPrescriptionMedicineRequest {

    private String medicineName;

    private String dosage;

    private String frequency;

    private String duration;

    private String instructions;
}