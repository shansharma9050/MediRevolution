package com.example.medi.order.client;


import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.example.medi.order.dto.NotificationRequest;

@FeignClient(name = "notification-service")
public interface NotificationClient {

    @PostMapping("/notifications")
    void createNotification(
            @RequestBody NotificationRequest request,
            @RequestHeader("Authorization") String token
    );
}