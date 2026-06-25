package com.example.medi.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscription_plans")
@Data
@NoArgsConstructor
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="plan_code", nullable = false, unique = true)
    private String planCode;

    @Column(name="plan_name", nullable = false)
    private String planName;

    @Column(name="target_role", nullable = false)
    private String targetRole;

    @Column(name="monthly_price", nullable = false)
    private BigDecimal monthlyPrice;

    @Column(name="yearly_price", nullable = false)
    private BigDecimal yearlyPrice;

    @Column(name="max_products")
    private Integer maxProducts;

    @Column(name="max_patients")
    private Integer maxPatients;

    @Column(name="max_appointments")
    private Integer maxAppointments;

    @Column(name="max_doctors")
    private Integer maxDoctors;

    @Column(name="online_consultation_enabled")
    private Boolean onlineConsultationEnabled = false;

    @Column(name="reports_enabled")
    private Boolean reportsEnabled = false;

    @Column(name="priority_support_enabled")
    private Boolean prioritySupportEnabled = false;

    private Boolean active = true;

    @Column(name="created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

}