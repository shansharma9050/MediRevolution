package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasPermissionCheckResponse {

    private Boolean allowed;
}