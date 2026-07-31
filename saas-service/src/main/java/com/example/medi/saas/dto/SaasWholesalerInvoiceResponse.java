package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasWholesalerInvoiceResponse {

    private Long id;

    private Long tenantId;

    private String invoiceNumber;

    private Long customerId;

    private String customerName;

    private String customerMobile;

    private String customerGstin;

    private BigDecimal subtotal;

    private BigDecimal discountAmount;

    private BigDecimal gstAmount;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal dueAmount;

    private String paymentStatus;

    private String paymentMode;

    private String transactionId;

    private String notes;

    private LocalDateTime invoiceDateTime;

    private LocalDateTime paymentDateTime;

    private List<SaasWholesalerInvoiceItemResponse> items;

}