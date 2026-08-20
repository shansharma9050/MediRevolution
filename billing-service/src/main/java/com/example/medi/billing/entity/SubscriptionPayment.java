package com.example.medi.billing.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.PaymentGateway;
import com.example.medi.billing.enums.SubscriptionPaymentStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subscription_payments", indexes = {

		@Index(name = "idx_subscription_payment_user", columnList = "auth_user_id"),

		@Index(name = "idx_subscription_payment_user_tenant", columnList = "auth_user_id, tenant_id"),

		@Index(name = "idx_subscription_payment_status", columnList = "payment_status"),

		@Index(name = "idx_subscription_payment_user_status", columnList = "auth_user_id, payment_status"),

		@Index(name = "idx_subscription_payment_subscription", columnList = "subscription_id") })
@Data
@NoArgsConstructor
public class SubscriptionPayment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "auth_user_id", nullable = false)
	private Long authUserId;

	@Column(name = "user_role", nullable = false, length = 30)
	private String userRole;

	@Column(name = "subscription_id")
	private Long subscriptionId;

	@Column(name = "plan_id", nullable = false)
	private Long planId;

	/*
	 * NULL = platform payment value = SaaS workspace payment
	 */
	@Column(name = "tenant_id")
	private Long tenantId;

	@Column(name = "plan_code", nullable = false, length = 100)
	private String planCode;

	@Column(name = "amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	@Enumerated(EnumType.STRING)
	@Column(name = "billing_cycle", nullable = false, length = 30)
	private BillingCycle billingCycle;

	@Column(name = "merchant_order_id", nullable = false, unique = true, length = 150)
	private String merchantOrderId;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_status", nullable = false, length = 30)
	private SubscriptionPaymentStatus paymentStatus;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_gateway", length = 30)
	private PaymentGateway paymentGateway;

	@Column(name = "transaction_id", length = 150)
	private String transactionId;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt = LocalDateTime.now();

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt = LocalDateTime.now();

	public void touch() {
		this.updatedAt = LocalDateTime.now();
	}
}