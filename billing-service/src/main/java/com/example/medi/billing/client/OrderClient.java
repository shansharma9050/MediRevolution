package com.example.medi.billing.client;


import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.example.medi.billing.dto.OrderResponse;

@FeignClient(name = "order-service")
public interface OrderClient {

    @GetMapping("/orders/{orderNo}")
    OrderResponse getOrderByOrderNo(
            @PathVariable String orderNo,
            @RequestHeader("Authorization") String token
    );
}
