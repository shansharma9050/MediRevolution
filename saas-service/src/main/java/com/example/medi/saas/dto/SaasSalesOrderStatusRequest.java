package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasSalesOrderStatusRequest {

    private Long tenantId;

    private String remarks;
}