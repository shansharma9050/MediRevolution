package com.example.medi.billing.entity;

import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.PaymentGateway;
import com.example.medi.billing.enums.SubscriptionPaymentStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscription_payments")
@Data
@NoArgsConstructor
public class SubscriptionPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="auth_user_id", nullable = false)
    private Long authUserId;

    @Column(name="user_role", nullable = false)
    private String userRole;

    @Column(name="subscription_id")
    private Long subscriptionId;

    @Column(name="plan_id", nullable = false)
    private Long planId;

    @Column(name="plan_code", nullable = false)
    private String planCode;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name="billing_cycle", nullable = false)
    private BillingCycle billingCycle;

    @Column(name="merchant_order_id", nullable = false, unique = true)
    private String merchantOrderId;

    @Enumerated(EnumType.STRING)
    @Column(name="payment_status", nullable = false)
    private SubscriptionPaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name="payment_gateway")
    private PaymentGateway paymentGateway;

    @Column(name="transaction_id")
    private String transactionId;

    @Column(name="created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name="updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}