package com.example.medi.auth.dto;

import com.example.medi.auth.enums.RoleName;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisteredPatientResponse {

    private Long userId;
    private String fullName;
    private String email;
    private String mobile;
    private RoleName role;

}