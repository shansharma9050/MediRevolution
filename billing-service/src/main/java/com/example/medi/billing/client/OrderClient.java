package com.example.medi.billing.client;


import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.example.medi.billing.dto.OrderResponse;

@FeignClient(name = "order-service")
public interface OrderClient {

    @GetMapping("/orders/{orderId}")
    OrderResponse getOrderById(
            @PathVariable Long orderId,
            @RequestHeader("Authorization") String token
    );
}
