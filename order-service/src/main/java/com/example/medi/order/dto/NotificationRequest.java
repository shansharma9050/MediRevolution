package com.example.medi.order.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    private Long receiverAuthUserId;
    private Long senderAuthUserId;
    private String type;
    private String title;
    private String message;

}
