package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasSalesOrderTimelineResponse {

    private Long id;

    private String timelineType;

    private String statusLabel;

    private String remarks;

    private Long referenceId;

    private LocalDateTime createdAt;
}