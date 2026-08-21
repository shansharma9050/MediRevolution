package com.example.medi.auth.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class CreateSaasCustomerRequest {

    private String fullName;

    private String email;

    private String mobile;

    private String password;

    private String role;
}