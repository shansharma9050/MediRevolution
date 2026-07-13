package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasWardRequest {

    private Long tenantId;

    private String wardName;

    private String wardType;

    private String description;
}