package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasDiagnosticOrderItemResponse {

    private Long id;

    private Long testId;

    private String testName;

    private String testCode;

    private BigDecimal price;
}