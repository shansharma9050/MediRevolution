package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasPharmacySaleItemResponse {

    private Long id;

    private Long medicineId;

    private Long stockId;

    private String medicineName;

    private String batchNumber;

    private Integer quantity;

    private BigDecimal salePrice;

    private BigDecimal totalPrice;
}