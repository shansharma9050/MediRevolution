package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasNotificationCountResponse;
import com.example.medi.saas.dto.SaasNotificationRequest;
import com.example.medi.saas.dto.SaasNotificationResponse;
import com.example.medi.saas.entity.SaasNotification;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasNotificationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SaasNotificationService {

    private final SaasNotificationRepository notificationRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;

    public SaasNotificationService(
            SaasNotificationRepository notificationRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {
        this.notificationRepository = notificationRepository;
        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
    }

    public SaasNotificationResponse createNotification(SaasNotificationRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.NOTIFICATIONS,
    	        SaasPermissionAction.CREATE
    	);

        validateRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasNotification notification = buildNotification(request);

        return toResponse(notificationRepository.save(notification));
    }

    /*
     * Internal method: service classes directly isko call kar sakti hain.
     * Isme tenant access validate nahi kar rahe, kyunki ye backend event ke andar call hoga.
     */
    public void createSystemNotification(
            Long tenantId,
            SaasNotificationType type,
            SaasNotificationPriority priority,
            String title,
            String message,
            Long referenceId,
            String referenceType,
            String actionUrl
    ) {
        if (tenantId == null || title == null || title.isBlank()) {
            return;
        }

        SaasNotification notification = new SaasNotification();
        notification.setTenantId(tenantId);
        notification.setNotificationType(type == null ? SaasNotificationType.SYSTEM : type);
        notification.setPriority(priority == null ? SaasNotificationPriority.MEDIUM : priority);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setReferenceId(referenceId);
        notification.setReferenceType(referenceType);
        notification.setActionUrl(actionUrl);
        notification.setReadStatus(false);
        notification.setActive(true);

        notificationRepository.save(notification);
    }

    public List<SaasNotificationResponse> getNotifications(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.NOTIFICATIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return notificationRepository
                .findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasNotificationResponse> getUnreadNotifications(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.NOTIFICATIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return notificationRepository
                .findByTenantIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasNotificationResponse> getNotificationsByType(Long tenantId, String type) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.NOTIFICATIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasNotificationType notificationType = SaasNotificationType.valueOf(type.toUpperCase());

        return notificationRepository
                .findByTenantIdAndNotificationTypeAndActiveTrueOrderByCreatedAtDesc(tenantId, notificationType)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasNotificationCountResponse getUnreadCount(Long tenantId) {

        tenantAccessService.validateTenantAccess(tenantId);

        Long count = notificationRepository.countByTenantIdAndReadStatusFalseAndActiveTrue(tenantId);

        return new SaasNotificationCountResponse(count);
    }

    public SaasNotificationResponse markRead(Long tenantId, Long notificationId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.NOTIFICATIONS,
    	        SaasPermissionAction.UPDATE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasNotification notification = notificationRepository
                .findByIdAndTenantIdAndActiveTrue(notificationId, tenantId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        notification.setReadStatus(true);
        notification.setReadAt(LocalDateTime.now());

        return toResponse(notificationRepository.save(notification));
    }

    public ApiResponse markAllRead(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.NOTIFICATIONS,
    	        SaasPermissionAction.UPDATE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        List<SaasNotification> notifications =
                notificationRepository.findByTenantIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(tenantId);

        for (SaasNotification notification : notifications) {
            notification.setReadStatus(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }

        return new ApiResponse(true, "All notifications marked as read");
    }

    public ApiResponse deleteNotification(Long tenantId, Long notificationId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.NOTIFICATIONS,
    	        SaasPermissionAction.DELETE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasNotification notification = notificationRepository
                .findByIdAndTenantIdAndActiveTrue(notificationId, tenantId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        notification.setActive(false);

        notificationRepository.save(notification);

        return new ApiResponse(true, "Notification deleted successfully");
    }

    private void validateRequest(SaasNotificationRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new RuntimeException("Notification title is required");
        }
    }

    private SaasNotification buildNotification(SaasNotificationRequest request) {

        SaasNotification notification = new SaasNotification();
        notification.setTenantId(request.getTenantId());
        notification.setAuthUserId(request.getAuthUserId());

        notification.setNotificationType(
                request.getNotificationType() == null || request.getNotificationType().isBlank()
                        ? SaasNotificationType.SYSTEM
                        : SaasNotificationType.valueOf(request.getNotificationType().toUpperCase())
        );

        notification.setPriority(
                request.getPriority() == null || request.getPriority().isBlank()
                        ? SaasNotificationPriority.MEDIUM
                        : SaasNotificationPriority.valueOf(request.getPriority().toUpperCase())
        );

        notification.setTitle(request.getTitle());
        notification.setMessage(request.getMessage());
        notification.setReferenceId(request.getReferenceId());
        notification.setReferenceType(request.getReferenceType());
        notification.setActionUrl(request.getActionUrl());
        notification.setReadStatus(false);
        notification.setActive(true);

        return notification;
    }

    private SaasNotificationResponse toResponse(SaasNotification notification) {
        return new SaasNotificationResponse(
                notification.getId(),
                notification.getTenantId(),
                notification.getAuthUserId(),
                notification.getNotificationType().name(),
                notification.getPriority().name(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getReferenceId(),
                notification.getReferenceType(),
                notification.getActionUrl(),
                notification.getReadStatus(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
    
    public void createSystemNotificationIfNotExists(
            Long tenantId,
            SaasNotificationType type,
            SaasNotificationPriority priority,
            String title,
            String message,
            Long referenceId,
            String referenceType,
            String actionUrl
    ) {
        if (tenantId == null || title == null || title.isBlank()) {
            return;
        }

        if (referenceId != null && referenceType != null && !referenceType.isBlank()) {
            boolean exists = notificationRepository
                    .existsByTenantIdAndNotificationTypeAndReferenceIdAndReferenceTypeAndReadStatusFalseAndActiveTrue(
                            tenantId,
                            type == null ? SaasNotificationType.SYSTEM : type,
                            referenceId,
                            referenceType
                    );

            if (exists) {
                return;
            }
        }

        createSystemNotification(
                tenantId,
                type,
                priority,
                title,
                message,
                referenceId,
                referenceType,
                actionUrl
        );
    }
}