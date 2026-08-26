package com.example.medi.saas.client;

import com.example.medi.saas.dto.AuthCustomerCreateRequest;
import com.example.medi.saas.dto.AuthStaffCreateRequest;
import com.example.medi.saas.dto.AuthUserResponse;
import com.example.medi.saas.dto.CreateSaasPatientRequest;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "auth-service")
public interface AuthClient {

    @PostMapping("/auth/internal/saas-staff")
    AuthUserResponse createSaasStaff(
            @RequestHeader("Authorization") String authorization,
            @RequestBody AuthStaffCreateRequest request
    );
    
    @PostMapping("/auth/internal/saas-customer")
    AuthUserResponse createSaasCustomer(
            @RequestHeader("Authorization") String authorization,
            @RequestBody AuthCustomerCreateRequest request
    );
    
    
    @PostMapping("/auth/internal/saas-patient")
    AuthUserResponse createSaasPatient(
            @RequestHeader("Authorization") String authorization,
            @RequestHeader("X-Internal-Service-Key") String internalServiceKey,
            @RequestBody CreateSaasPatientRequest request
    );


    @GetMapping("/auth/internal/users/by-email")
    AuthUserResponse getUserByEmail(
            @RequestHeader("Authorization") String authorization,
            @RequestParam String email
    );
}