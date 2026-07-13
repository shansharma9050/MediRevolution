package com.example.medi.saas.client;

import com.example.medi.saas.dto.AuthStaffCreateRequest;
import com.example.medi.saas.dto.AuthUserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "auth-service")
public interface AuthClient {

    @PostMapping("/auth/internal/saas-staff")
    AuthUserResponse createSaasStaff(
            @RequestHeader("Authorization") String authorization,
            @RequestBody AuthStaffCreateRequest request
    );

    @GetMapping("/auth/internal/users/by-email")
    AuthUserResponse getUserByEmail(
            @RequestHeader("Authorization") String authorization,
            @RequestParam String email
    );
}