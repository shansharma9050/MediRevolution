package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class CreateTenantRequest {

    private String tenantName;

    private String tenantType;

    private String contactEmail;

    private String contactMobile;

    private String address;

    private String city;

    private String state;

    private String pincode;
}