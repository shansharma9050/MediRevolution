package com.example.medi.notification.controller;

import org.springframework.web.bind.annotation.*;

import com.example.medi.notification.dto.NotificationRequest;
import com.example.medi.notification.entity.Notification;
import com.example.medi.notification.service.NotificationService;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    public Notification createNotification(@RequestBody NotificationRequest request) {
        return notificationService.createNotification(request);
    }

    @GetMapping("/my")
    public List<Notification> getMyNotifications() {
        return notificationService.getMyNotifications();
    }

    @GetMapping("/my/unread-count")
    public long getMyUnreadCount() {
        return notificationService.getMyUnreadCount();
    }

    @PutMapping("/{notificationId}/read")
    public Notification markAsRead(@PathVariable Long notificationId) {
        return notificationService.markAsRead(notificationId);
    }
}
