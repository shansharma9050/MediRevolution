package com.example.medi.saas.dto;

import com.example.medi.saas.enums.SaasAvailabilityStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class SaasDoctorAvailabilityResponse {

    private Long id;

    private Long tenantId;

    private Long doctorAuthUserId;

    private String doctorName;

    private LocalDate availableDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private Integer slotDurationMinutes;

    private SaasAvailabilityStatus status;

    private Long createdByAuthUserId;

    private Long updatedByAuthUserId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}