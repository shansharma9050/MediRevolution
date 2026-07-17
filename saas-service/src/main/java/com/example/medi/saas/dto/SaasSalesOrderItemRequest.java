package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasSalesOrderItemRequest {

    private Long medicineId;

    private Integer quantity;

    private BigDecimal saleRate;

    private BigDecimal discountPercentage;

    private BigDecimal gstPercentage;
}