package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TenantResponse {

    private Long tenantId;

    private String tenantName;

    private String tenantCode;

    private String tenantType;

    private String status;

    private String owner;
}