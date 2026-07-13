package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasStockAdjustmentRequest {

    private Long tenantId;

    private Long stockId;

    /*
     * ADJUSTMENT_IN, ADJUSTMENT_OUT, EXPIRED, DAMAGED
     */
    private String movementType;

    private Integer quantity;

    private String remarks;
}