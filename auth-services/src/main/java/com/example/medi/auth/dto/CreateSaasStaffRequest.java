package com.example.medi.auth.dto;

import lombok.Data;

@Data
public class CreateSaasStaffRequest {

    private String fullName;

    private String email;

    private String mobile;

    private String password;

    private String role;
}