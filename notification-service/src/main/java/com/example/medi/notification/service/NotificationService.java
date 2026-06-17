package com.example.medi.notification.service;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.notification.dto.NotificationRequest;
import com.example.medi.notification.entity.Notification;
import com.example.medi.notification.repository.NotificationRepository;
import com.example.medi.notification.security.CurrentUserUtil;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @CacheEvict(
            value = {"myNotifications", "unreadCount"},
            key = "#request.receiverAuthUserId"
    )
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

        Notification saved = notificationRepository.save(notification);

        messagingTemplate.convertAndSend(
                "/topic/user-" + saved.getReceiverAuthUserId(),
                saved
        );

        return saved;
    }

    @Cacheable(
            value = "myNotifications",
            key = "T(com.example.medi.notification.security.CurrentUserUtil).getUserId()"
    )
    public List<Notification> getMyNotifications() {

        return notificationRepository
                .findByReceiverAuthUserIdOrderByCreatedAtDesc(
                        CurrentUserUtil.getUserId()
                );
    }

    @Cacheable(
            value = "unreadCount",
            key = "T(com.example.medi.notification.security.CurrentUserUtil).getUserId()"
    )
    public long getMyUnreadCount() {

        return notificationRepository
                .countByReceiverAuthUserIdAndReadStatusFalse(
                        CurrentUserUtil.getUserId()
                );
    }

    public Notification markAsRead(Long notificationId) {

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getReceiverAuthUserId().equals(CurrentUserUtil.getUserId())) {
            throw new AccessDeniedException("You can update only your own notifications");
        }

        notification.setReadStatus(true);

        Notification saved = notificationRepository.save(notification);

        evictNotificationCache(saved.getReceiverAuthUserId());

        return saved;
    }

    @CacheEvict(
            value = {"myNotifications", "unreadCount"},
            key = "#receiverAuthUserId"
    )
    public void evictNotificationCache(Long receiverAuthUserId) {
        // only clears cache for this user
    }
}