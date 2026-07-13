package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasTenantMemberWithPermissionResponse {

    private Long memberId;

    private Long tenantId;

    private Long authUserId;

    private String name;

    private String email;

    private String mobile;

    private String memberRole;

    private Boolean active;
}