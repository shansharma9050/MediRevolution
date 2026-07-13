package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasAppointmentType;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "saas_appointments")
@Getter
@Setter
public class SaasAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_staff_id", nullable = false)
    private Long doctorStaffId;

    @Column(name = "doctor_auth_user_id", nullable = false)
    private Long doctorAuthUserId;

    @Column(name = "doctor_name", length = 150)
    private String doctorName;

    @Column(name = "department", length = 120)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(name = "appointment_type", nullable = false, length = 30)
    private SaasAppointmentType appointmentType;

    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;

    @Column(name = "appointment_time", nullable = false)
    private LocalTime appointmentTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SaasAppointmentStatus status;

    @Column(name = "symptoms", columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "meeting_url", length = 500)
    private String meetingUrl;

    @Column(name = "created_by_auth_user_id")
    private Long createdByAuthUserId;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (active == null) {
            active = true;
        }
    }

    public void touch() {
        updatedAt = LocalDateTime.now();
    }
}