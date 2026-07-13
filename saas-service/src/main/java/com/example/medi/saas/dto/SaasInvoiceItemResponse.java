package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasInvoiceItemResponse {

    private Long id;

    private String itemName;

    private String itemType;

    private Integer quantity;

    private BigDecimal unitPrice;

    private BigDecimal totalPrice;
}