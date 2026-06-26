package com.example.medi.medicine.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import com.example.medi.medicine.dto.WholesalerProfileResponse;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/users/profiles/wholesaler/public/{authUserId}")
    WholesalerProfileResponse getWholesalerProfileByAuthUserId(
            @PathVariable("authUserId") Long authUserId,
            @RequestHeader("Authorization") String authorization
    );
}