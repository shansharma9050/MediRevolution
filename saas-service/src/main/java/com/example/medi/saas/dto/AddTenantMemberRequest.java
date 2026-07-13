package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class AddTenantMemberRequest {

    private Long authUserId;

    private String name;

    private String email;

    private String mobile;

    private String memberRole;
}