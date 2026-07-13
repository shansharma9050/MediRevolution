package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class AuthUserResponse {

    private Long id;

    private String fullName;

    private String email;

    private String mobile;

    private String role;

    private Boolean active;

    private Boolean approved;
}