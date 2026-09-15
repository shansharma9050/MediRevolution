package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasIpdBedTransferRequest {

    private Long tenantId;

    private Long wardId;

    private Long bedId;
}