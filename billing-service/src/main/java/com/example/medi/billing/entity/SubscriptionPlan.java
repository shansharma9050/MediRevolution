package com.example.medi.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.SubscriptionRole;

@Entity
@Table(name = "subscription_plans")
@Data
@NoArgsConstructor
public class SubscriptionPlan {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String planName;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SubscriptionRole role;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private BillingCycle billingCycle;
    
    @Column(name = "plan_code", nullable = false, unique = true)
    private String planCode;
    
    @Column(name = "monthly_price")
    private BigDecimal monthlyPrice;

    private BigDecimal price;

    private Integer durationDays;

    private Integer maxMedicines;

    private Integer maxAppointments;

    private Integer maxStaff;

    private Boolean videoConsultationAllowed = false;

    private Boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();

}