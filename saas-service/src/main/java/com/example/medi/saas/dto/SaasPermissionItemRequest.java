package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasPermissionItemRequest {

    /*
     * PATIENTS, APPOINTMENTS, BILLING etc.
     */
    private String module;

    /*
     * VIEW, CREATE, UPDATE, DELETE, APPROVE, EXPORT, PRINT
     */
    private String permissionAction;

    private Boolean allowed;
}