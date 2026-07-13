package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.example.medi.saas.enums.SaasAvailabilityStatus;

@Entity
@Table(
        name = "saas_doctor_availability",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saas_doctor_availability_slot",
                        columnNames = {
                                "tenant_id",
                                "doctor_auth_user_id",
                                "available_date",
                                "start_time",
                                "end_time"
                        }
                )
        }
)
@Data
@NoArgsConstructor
public class SaasDoctorAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * SaaS workspace / tenant id.
     */
    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    /*
     * Doctor ka auth-service user id.
     * Ye tenant_members.auth_user_id se match karega.
     */
    @Column(name = "doctor_auth_user_id", nullable = false)
    private Long doctorAuthUserId;

    /*
     * Display ke liye doctor name bhi save kar rahe hain.
     */
    @Column(name = "doctor_name", length = 150)
    private String doctorName;

    @Column(name = "available_date", nullable = false)
    private LocalDate availableDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    /*
     * Example: 10, 15, 20, 30 minutes.
     */
    @Column(name = "slot_duration_minutes", nullable = false)
    private Integer slotDurationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SaasAvailabilityStatus status = SaasAvailabilityStatus.ACTIVE;

    @Column(name = "created_by_auth_user_id")
    private Long createdByAuthUserId;

    @Column(name = "updated_by_auth_user_id")
    private Long updatedByAuthUserId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();

        if (this.status == null) {
            this.status = SaasAvailabilityStatus.ACTIVE;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}