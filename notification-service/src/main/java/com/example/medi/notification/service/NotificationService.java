package com.example.medi.notification.service;


import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.notification.dto.NotificationRequest;
import com.example.medi.notification.entity.Notification;
import com.example.medi.notification.repository.NotificationRepository;
import com.example.medi.notification.security.CurrentUserUtil;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public Notification createNotification(NotificationRequest request) {

        if (request.getReceiverAuthUserId() == null) {
            throw new RuntimeException("Receiver user id is required");
        }

        Notification notification = new Notification();
        notification.setReceiverAuthUserId(request.getReceiverAuthUserId());
        notification.setSenderAuthUserId(request.getSenderAuthUserId());
        notification.setType(request.getType());
        notification.setTitle(request.getTitle());
        notification.setMessage(request.getMessage());

        return notificationRepository.save(notification);
    }

    public List<Notification> getMyNotifications() {
        return notificationRepository
                .findByReceiverAuthUserIdOrderByCreatedAtDesc(CurrentUserUtil.getUserId());
    }

    public long getMyUnreadCount() {
        return notificationRepository
                .countByReceiverAuthUserIdAndReadStatusFalse(CurrentUserUtil.getUserId());
    }

    public Notification markAsRead(Long notificationId) {

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getReceiverAuthUserId().equals(CurrentUserUtil.getUserId())) {
            throw new AccessDeniedException("You can update only your own notifications");
        }

        notification.setReadStatus(true);

        return notificationRepository.save(notification);
    }
}
