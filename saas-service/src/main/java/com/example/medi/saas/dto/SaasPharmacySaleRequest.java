package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SaasPharmacySaleRequest {

    private Long tenantId;

    private Long patientId;

    private BigDecimal discountAmount;

    private BigDecimal taxAmount;

    private BigDecimal paidAmount;

    private String paymentMode;

    private List<SaasPharmacySaleItemRequest> items;
}