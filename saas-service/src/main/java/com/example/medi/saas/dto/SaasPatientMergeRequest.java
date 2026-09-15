package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasPatientMergeRequest {

    private Long tenantId;

    private Long targetPatientId;

    private Long sourcePatientId;

    private String reason;
}