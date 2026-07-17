package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasSalesOrderResponse {

    private Long id;

    private Long tenantId;

    private String orderNumber;

    private LocalDate orderDate;

    private LocalDate expectedDeliveryDate;

    private Long customerId;

    private String customerCode;

    private String customerName;

    private String customerType;

    private String customerMobile;

    private String customerGstin;

    private String shippingAddress;

    private Integer totalQuantity;

    private BigDecimal grossAmount;

    private BigDecimal discountAmount;

    private BigDecimal taxableAmount;

    private BigDecimal gstAmount;

    private BigDecimal otherCharges;

    private BigDecimal roundOffAmount;

    private BigDecimal grandTotal;

    private String orderStatus;

    private Long convertedSaleId;

    private String convertedSaleNumber;

    private String rejectionReason;

    private String cancellationReason;

    private String remarks;

    private LocalDateTime createdAt;

    private List<SaasSalesOrderItemResponse> items;

    private List<SaasSalesOrderTimelineResponse> timeline;
}