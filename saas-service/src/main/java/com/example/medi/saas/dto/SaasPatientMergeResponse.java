package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaasPatientMergeResponse {

    private Long id;

    private Long tenantId;

    private Long targetPatientId;

    private String targetPatientCode;

    private String targetPatientName;

    private Long sourcePatientId;

    private String sourcePatientCode;

    private String sourcePatientName;

    private String status;

    private String reason;

    private int appointmentCount;

    private int prescriptionCount;

    private int opdCount;

    private int ipdCount;

    private int diagnosticCount;

    private int invoiceCount;

    private int documentCount;

    private int allergyCount;

    private LocalDateTime mergedAt;

    private LocalDateTime unmergedAt;
}