package com.example.medi.notification.dto;

import com.example.medi.notification.enums.NotificationType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    private Long receiverAuthUserId;
    private Long senderAuthUserId;
    private NotificationType type;
    private String title;
    private String message;

}