package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class SaasExpiryActionRequest {

    private Long tenantId;

    private Long stockId;

    private LocalDate actionDate;

    private String actionType;

    private Integer quantity;

    private String disposalMethod;

    private String adjustmentReason;

    private String referenceNumber;

    private String authorizedBy;

    private String witnessName;

    private String disposalLocation;

    private String reasonDetails;

    private String remarks;

    /*
     * RETURN_TO_SUPPLIER action ke liye optional existing
     * Purchase Return record.
     */
    private Long purchaseReturnId;
    
    private Boolean consumeFromQuarantine;
}