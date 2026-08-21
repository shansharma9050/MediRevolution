package com.example.medi.saas.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AuthCustomerCreateRequest {

    private String fullName;

    private String email;

    private String mobile;

    private String password;

    private String role;
}