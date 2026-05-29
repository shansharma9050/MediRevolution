package com.example.medi.notification.entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.example.medi.notification.enums.NotificationType;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long receiverAuthUserId;

    private Long senderAuthUserId;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private String title;

    @Column(length = 2000)
    private String message;

    private boolean readStatus = false;

    private LocalDateTime createdAt = LocalDateTime.now();

}
