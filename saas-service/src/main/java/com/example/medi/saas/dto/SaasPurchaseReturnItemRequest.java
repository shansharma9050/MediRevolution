package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasPurchaseReturnItemRequest {

    private Long purchaseItemId;

    private Long stockId;

    private Integer returnQuantity;

    private String returnReason;

    private String reasonDetails;
}