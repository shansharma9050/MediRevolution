package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasDiagnosticResultRequest {

    private Long tenantId;

    private String resultSummary;

    private String resultDetails;

    /*
     * Abhi hum file upload nahi kar rahe.
     * Future me actual uploaded file ka URL yahan save kar sakte hain.
     */
    private String reportFileUrl;
}