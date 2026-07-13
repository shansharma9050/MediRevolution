package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_notifications")
@Data
public class SaasNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant / workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    /*
     * Optional targeted user.
     * Null ka matlab tenant-level notification.
     */
    private Long authUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SaasNotificationType notificationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasNotificationPriority priority = SaasNotificationPriority.MEDIUM;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 1000)
    private String message;

    /*
     * Example:
     * APPOINTMENT id, INVOICE id, STOCK id, IPD admission id, diagnostic order id.
     */
    private Long referenceId;

    @Column(length = 120)
    private String referenceType;

    @Column(length = 500)
    private String actionUrl;

    private Boolean readStatus = false;

    private Boolean active = true;

    private LocalDateTime readAt;

    private LocalDateTime createdAt = LocalDateTime.now();
}