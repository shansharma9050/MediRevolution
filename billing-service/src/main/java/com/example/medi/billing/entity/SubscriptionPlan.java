package com.example.medi.billing.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.SubscriptionRole;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subscription_plans", indexes = {
		@Index(name = "idx_subscription_plan_role_active", columnList = "role, active"),
		@Index(name = "idx_subscription_plan_code", columnList = "plan_code") })
@Data
@NoArgsConstructor
public class SubscriptionPlan {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "plan_name", nullable = false, length = 100)
	private String planName;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false, length = 30)
	private SubscriptionRole role;

	/*
	 * Kept for compatibility. Actual checkout billing cycle comes from user
	 * selection.
	 */
	@Enumerated(EnumType.STRING)
	@Column(name = "billing_cycle", length = 30)
	private BillingCycle billingCycle;

	@Column(name = "plan_code", nullable = false, unique = true, length = 100)
	private String planCode;

	@Column(name = "monthly_price", precision = 12, scale = 2)
	private BigDecimal monthlyPrice;

	@Column(name = "yearly_price", precision = 12, scale = 2)
	private BigDecimal yearlyPrice;

	/*
	 * Keep temporarily for old database compatibility. DO NOT use this for new
	 * payment calculations.
	 */
	@Column(name = "price", precision = 12, scale = 2)
	private BigDecimal price;

	/*
	 * Kept for backward compatibility. New subscription duration logic will use
	 * BillingCycle.
	 */
	@Column(name = "duration_days")
	private Integer durationDays;

	@Column(name = "max_medicines")
	private Integer maxMedicines;

	@Column(name = "max_appointments")
	private Integer maxAppointments;

	@Column(name = "max_staff")
	private Integer maxStaff;

	@Column(name = "video_consultation_allowed")
	private Boolean videoConsultationAllowed = false;

	@Column(name = "reports_enabled")
	private Boolean reportsEnabled = false;

	@Column(name = "priority_support_enabled")
	private Boolean prioritySupportEnabled = false;

	@Column(name = "active")
	private Boolean active = true;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt = LocalDateTime.now();
}