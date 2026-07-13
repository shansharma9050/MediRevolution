package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasPharmacySaleResponse {

    private Long id;

    private Long tenantId;

    private String saleNumber;

    private Long patientId;

    private String patientName;

    private String patientMobile;

    private Long invoiceId;

    private BigDecimal subtotal;

    private BigDecimal discountAmount;

    private BigDecimal taxAmount;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal dueAmount;

    private String paymentStatus;

    private String paymentMode;

    private String status;

    private LocalDateTime saleDateTime;

    private List<SaasPharmacySaleItemResponse> items;
}