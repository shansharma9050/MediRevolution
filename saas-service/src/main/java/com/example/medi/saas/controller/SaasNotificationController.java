package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasNotificationCountResponse;
import com.example.medi.saas.dto.SaasNotificationRequest;
import com.example.medi.saas.dto.SaasNotificationResponse;
import com.example.medi.saas.service.SaasNotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/notifications")
public class SaasNotificationController {

    private final SaasNotificationService notificationService;

    public SaasNotificationController(SaasNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    public SaasNotificationResponse createNotification(@RequestBody SaasNotificationRequest request) {
        return notificationService.createNotification(request);
    }

    @GetMapping
    public List<SaasNotificationResponse> getNotifications(@RequestParam Long tenantId) {
        return notificationService.getNotifications(tenantId);
    }

    @GetMapping("/unread")
    public List<SaasNotificationResponse> getUnreadNotifications(@RequestParam Long tenantId) {
        return notificationService.getUnreadNotifications(tenantId);
    }

    @GetMapping("/type")
    public List<SaasNotificationResponse> getNotificationsByType(
            @RequestParam Long tenantId,
            @RequestParam String type
    ) {
        return notificationService.getNotificationsByType(tenantId, type);
    }

    @GetMapping("/count")
    public SaasNotificationCountResponse getUnreadCount(@RequestParam Long tenantId) {
        return notificationService.getUnreadCount(tenantId);
    }

    @PutMapping("/{notificationId}/read")
    public SaasNotificationResponse markRead(
            @PathVariable Long notificationId,
            @RequestParam Long tenantId
    ) {
        return notificationService.markRead(tenantId, notificationId);
    }

    @PutMapping("/read-all")
    public ApiResponse markAllRead(@RequestParam Long tenantId) {
        return notificationService.markAllRead(tenantId);
    }

    @DeleteMapping("/{notificationId}")
    public ApiResponse deleteNotification(
            @PathVariable Long notificationId,
            @RequestParam Long tenantId
    ) {
        return notificationService.deleteNotification(tenantId, notificationId);
    }
}