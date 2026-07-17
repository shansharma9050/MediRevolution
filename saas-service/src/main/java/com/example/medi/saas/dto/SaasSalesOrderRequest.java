package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class SaasSalesOrderRequest {

    private Long tenantId;

    private LocalDate orderDate;

    private LocalDate expectedDeliveryDate;

    private Long customerId;

    private String shippingAddress;

    private BigDecimal otherCharges;

    private BigDecimal roundOffAmount;

    private String remarks;

    private List<SaasSalesOrderItemRequest> items;
}