package com.example.medi.saas.dto;

import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Data
public class SaasDoctorScheduleRequest {

    private Long tenantId;

    private Long doctorProfileId;

    private DayOfWeek dayOfWeek;

    private LocalTime startTime;

    private LocalTime endTime;

    private Integer slotDurationMinutes;
}