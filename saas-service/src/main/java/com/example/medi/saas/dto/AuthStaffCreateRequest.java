package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class AuthStaffCreateRequest {

    private String fullName;

    private String email;

    private String mobile;

    private String password;

    private String role = "SAAS_STAFF";
}