package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class SaasCurrentPermissionResponse {

    private Long tenantId;

    private Long authUserId;

    private String memberRole;

    private Boolean ownerOrAdmin;

    private List<SaasMemberPermissionResponse> permissions;
}