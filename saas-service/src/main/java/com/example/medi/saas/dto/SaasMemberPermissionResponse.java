package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasMemberPermissionResponse {

    private Long id;

    private Long tenantId;

    private Long authUserId;

    private String module;

    private String permissionAction;

    private Boolean allowed;
}