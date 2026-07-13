package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasDiagnosticTestResponse {

    private Long id;

    private Long tenantId;

    private String diagnosticType;

    private String testName;

    private String testCode;

    private String category;

    private String description;

    private BigDecimal price;

    private Boolean active;
}