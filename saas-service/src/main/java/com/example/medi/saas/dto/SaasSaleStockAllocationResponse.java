package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class SaasSaleStockAllocationResponse {

    private Long id;

    private Long stockId;

    private String batchNumber;

    private LocalDate expiryDate;

    private Integer allocatedQuantity;

    private BigDecimal purchasePrice;

    private BigDecimal saleRate;
}