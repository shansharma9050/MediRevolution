package com.example.medi.saas.entity;

import com.example.medi.saas.enums.DoctorAvailabilityStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "saas_doctor_schedules")
@Data
public class SaasDoctorSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long doctorProfileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DayOfWeek dayOfWeek;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    private Integer slotDurationMinutes = 15;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DoctorAvailabilityStatus status = DoctorAvailabilityStatus.AVAILABLE;

    private Boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();
}