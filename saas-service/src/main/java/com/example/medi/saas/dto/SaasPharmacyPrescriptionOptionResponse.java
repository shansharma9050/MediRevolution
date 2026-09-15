package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasPharmacyPrescriptionOptionResponse {

    private Long id;

    private Long patientId;

    private String patientName;

    private String patientMobile;

    private String doctorName;

    private String diagnosis;

    private LocalDateTime createdAt;

    private List<String> medicineNames;
}