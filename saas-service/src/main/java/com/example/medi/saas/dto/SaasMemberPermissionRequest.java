package com.example.medi.saas.dto;

import lombok.Data;

import java.util.List;

@Data
public class SaasMemberPermissionRequest {

    private Long tenantId;

    private Long authUserId;

    private List<SaasPermissionItemRequest> permissions;
}