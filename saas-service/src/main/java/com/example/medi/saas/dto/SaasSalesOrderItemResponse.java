package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasSalesOrderItemResponse {

    private Long id;

    private Long medicineId;

    private String medicineName;

    private String medicineType;

    private String manufacturer;

    private Integer quantity;

    private Integer availableQuantityAtOrder;

    private BigDecimal saleRate;

    private BigDecimal grossAmount;

    private BigDecimal discountPercentage;

    private BigDecimal discountAmount;

    private BigDecimal taxableAmount;

    private BigDecimal gstPercentage;

    private BigDecimal gstAmount;

    private BigDecimal lineTotal;
}