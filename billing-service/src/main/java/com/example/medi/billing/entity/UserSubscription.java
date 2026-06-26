package com.example.medi.billing.entity;

import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.SubscriptionRole;
import com.example.medi.billing.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_subscriptions")
@Data
@NoArgsConstructor
public class UserSubscription {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long authUserId;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SubscriptionRole role;

    @ManyToOne
    @JoinColumn(name = "plan_id")
    private SubscriptionPlan plan;

    private LocalDate startDate;

    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SubscriptionStatus status;

    private String paymentOrderId;

    private String paymentTransactionId;

    private LocalDateTime createdAt = LocalDateTime.now();

}
