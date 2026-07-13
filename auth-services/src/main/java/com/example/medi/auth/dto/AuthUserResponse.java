package com.example.medi.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthUserResponse {

    private Long id;

    private String fullName;

    private String email;

    private String mobile;

    private String role;

    private Boolean active;

    private Boolean approved;
}