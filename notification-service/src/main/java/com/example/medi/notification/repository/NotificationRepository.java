package com.example.medi.notification.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.notification.entity.Notification;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByReceiverAuthUserIdOrderByCreatedAtDesc(Long receiverAuthUserId);

    long countByReceiverAuthUserIdAndReadStatusFalse(Long receiverAuthUserId);
}