package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasDiagnosticTestRequest {

    private Long tenantId;

    /*
     * LAB or RADIOLOGY
     */
    private String diagnosticType;

    private String testName;

    private String testCode;

    private String category;

    private String description;

    private BigDecimal price;
}