package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaasWholesalerInvoiceItemRequest {

    private Long medicineId;

    private String medicineName;

    private String batchNumber;

    private Integer quantity;

    private BigDecimal unitPrice;

    private BigDecimal discountPercentage;

    private BigDecimal discountAmount;

    private BigDecimal gstPercentage;

    private BigDecimal gstAmount;

    private BigDecimal totalPrice;

}