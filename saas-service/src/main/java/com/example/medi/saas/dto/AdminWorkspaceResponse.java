package com.example.medi.saas.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminWorkspaceResponse {

    private Long tenantId;

    private String tenantName;

    private String tenantCode;

    private String tenantType;

    private String status;

    private Long ownerAuthUserId;

    private LocalDate validFrom;

    private LocalDate validUntil;
}