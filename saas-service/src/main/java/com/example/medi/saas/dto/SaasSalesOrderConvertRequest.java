package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SaasSalesOrderConvertRequest {

    private Long tenantId;

    private LocalDate saleDate;

    private BigDecimal paidAmount;

    private String remarks;
}