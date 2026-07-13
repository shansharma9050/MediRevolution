package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasInvoiceItemRequest {

    private String itemName;

    private String itemType;

    private Integer quantity;

    private BigDecimal unitPrice;
}