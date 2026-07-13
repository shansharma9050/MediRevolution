package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasPharmacySaleItemRequest {

    private Long medicineId;

    private Long stockId;

    private Integer quantity;
}