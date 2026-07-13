package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasPrescriptionMedicineResponse {

    private Long id;

    private String medicineName;

    private String dosage;

    private String frequency;

    private String duration;

    private String instructions;
}