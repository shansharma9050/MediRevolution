package com.example.medi.order.dto;


import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlaceOrderRequest {

    private Long wholesalerAuthUserId;
    private List<PlaceOrderItemRequest> items;

    
}
