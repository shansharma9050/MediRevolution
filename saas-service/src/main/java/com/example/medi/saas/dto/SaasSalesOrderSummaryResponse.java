package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasSalesOrderSummaryResponse {

    private Long totalOrders;

    private Long pendingOrders;

    private Long confirmedOrders;

    private Long dispatchedOrders;

    private Long deliveredOrders;

    private BigDecimal totalOrderValue;
}