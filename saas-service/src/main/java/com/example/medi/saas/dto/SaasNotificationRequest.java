package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasNotificationRequest {

    private Long tenantId;

    private Long authUserId;

    private String notificationType;

    private String priority;

    private String title;

    private String message;

    private Long referenceId;

    private String referenceType;

    private String actionUrl;
}