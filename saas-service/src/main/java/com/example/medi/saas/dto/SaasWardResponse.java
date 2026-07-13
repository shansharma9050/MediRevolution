package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasWardResponse {

    private Long id;

    private Long tenantId;

    private String wardName;

    private String wardType;

    private String description;

    private Boolean active;
}