package com.example.medi.order.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OrderDashboardCountResponse {

    private long totalOrders;
    private long pendingOrders;
    private long acceptedOrders;
    private long rejectedOrders;
    private long deliveredOrders;

   
}