package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasNotificationResponse {

    private Long id;

    private Long tenantId;

    private Long authUserId;

    private String notificationType;

    private String priority;

    private String title;

    private String message;

    private Long referenceId;

    private String referenceType;

    private String actionUrl;

    private Boolean readStatus;

    private LocalDateTime readAt;

    private LocalDateTime createdAt;
}