package com.example.medi.billing.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.SubscriptionRole;
import com.example.medi.billing.enums.SubscriptionStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_subscriptions", indexes = {
		@Index(name = "idx_user_subscription_user_status", columnList = "auth_user_id, status"),
		@Index(name = "idx_user_subscription_user_tenant_status", columnList = "auth_user_id, tenant_id, status"),
		@Index(name = "idx_user_subscription_user_tenant_dates", columnList = "auth_user_id, tenant_id, start_date, end_date"),
		@Index(
			    name = "idx_user_subscription_user_tenant_status_dates",
			    columnList = "auth_user_id, tenant_id, status, start_date, end_date"
			),
		@Index(name = "idx_user_subscription_payment_order", columnList = "payment_order_id") })
@Data
@NoArgsConstructor
public class UserSubscription {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "auth_user_id", nullable = false)
	private Long authUserId;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false, length = 30)
	private SubscriptionRole role;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "plan_id", nullable = false, foreignKey = @ForeignKey(name = "fk_user_subscription_plan"))
	private SubscriptionPlan plan;

	@Enumerated(EnumType.STRING)
	@Column(name = "billing_cycle", length = 30)
	private BillingCycle billingCycle;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "end_date", nullable = false)
	private LocalDate endDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 30)
	private SubscriptionStatus status;

	@Column(name = "payment_order_id", length = 150)
	private String paymentOrderId;

	@Column(name = "payment_transaction_id", length = 150)
	private String paymentTransactionId;

	/*
	 * NULL = main platform subscription value = SaaS workspace subscription
	 */
	@Column(name = "tenant_id")
	private Long tenantId;

	/*
	 * Cancellation is scheduled.
	 *
	 * IMPORTANT: status remains ACTIVE until endDate.
	 */
	@Column(name = "cancellation_requested", nullable = false)
	private Boolean cancellationRequested = false;

	@Column(name = "cancelled_at")
	private LocalDateTime cancelledAt;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt = LocalDateTime.now();
}