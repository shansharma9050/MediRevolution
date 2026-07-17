package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasSalesReturnItemRequest {

    private Long saleStockAllocationId;

    private Integer returnQuantity;

    private String returnReason;

    private String reasonDetails;
}