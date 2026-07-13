package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class SaasDoctorAvailabilityRequest {

    private Long tenantId;

    private Long doctorAuthUserId;

    private String doctorName;

    private LocalDate availableDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private Integer slotDurationMinutes;
}