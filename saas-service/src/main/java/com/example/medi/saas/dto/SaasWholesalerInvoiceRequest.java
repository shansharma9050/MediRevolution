package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SaasWholesalerInvoiceRequest {

    private Long tenantId;

    private Long customerId;

    private String customerName;

    private String customerMobile;

    private String customerGstin;

    private BigDecimal subtotal;

    private BigDecimal discountAmount;

    private BigDecimal gstAmount;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private String paymentMode;

    private String transactionId;

    private String notes;

    private List<SaasWholesalerInvoiceItemRequest> items;

}