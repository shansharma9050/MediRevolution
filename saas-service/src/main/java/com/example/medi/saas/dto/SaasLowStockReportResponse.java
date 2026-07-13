package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasLowStockReportResponse {

    private Long stockId;

    private String medicineName;

    private String batchNumber;

    private LocalDate expiryDate;

    private Integer currentQuantity;

    private Integer reorderLevel;

    private Boolean expired;
}