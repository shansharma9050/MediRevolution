package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasStockMovementResponse {

    private Long id;

    private Long tenantId;

    private Long medicineId;

    private String medicineName;

    private Long stockId;

    private String batchNumber;

    private String movementType;

    private Integer quantity;

    private String remarks;

    private Long referenceId;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt;
}