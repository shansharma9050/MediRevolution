package com.example.medi.saas.dto;

import java.time.LocalDate;

import lombok.Data;

@Data
public class AdminCreateTenantRequest {

    private Long userId;

    private String tenantName;

    private String tenantType;

    private String contactEmail;

    private String contactMobile;

    private String address;

    private String city;

    private String state;

    private String pincode;

    /*
     * Workspace validity controlled by SUPER_ADMIN.
     */
    private LocalDate validFrom;

    private LocalDate validUntil;
}