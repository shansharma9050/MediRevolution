package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_expiry_configurations", uniqueConstraints = {
		@UniqueConstraint(name = "uk_saas_expiry_config_tenant", columnNames = "tenant_id") }, indexes = {
				@Index(name = "idx_saas_expiry_config_tenant", columnList = "tenant_id") })
@Data
@NoArgsConstructor
public class SaasExpiryConfiguration {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "near_expiry_days", nullable = false)
	private Integer nearExpiryDays = 90;

	@Column(name = "critical_expiry_days", nullable = false)
	private Integer criticalExpiryDays = 30;

	@Column(name = "alert_enabled", nullable = false)
	private Boolean alertEnabled = true;

	@Column(name = "daily_alert_enabled", nullable = false)
	private Boolean dailyAlertEnabled = true;

	@Column(name = "include_zero_stock_batches", nullable = false)
	private Boolean includeZeroStockBatches = false;

	@Column(name = "auto_quarantine_expired_stock", nullable = false)
	private Boolean autoQuarantineExpiredStock = false;

	@Column(name = "created_by_auth_user_id")
	private Long createdByAuthUserId;

	@Column(name = "updated_by_auth_user_id")
	private Long updatedByAuthUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@PrePersist
	public void prePersist() {

		if (nearExpiryDays == null) {
			nearExpiryDays = 90;
		}

		if (criticalExpiryDays == null) {
			criticalExpiryDays = 30;
		}

		if (alertEnabled == null) {
			alertEnabled = true;
		}

		if (dailyAlertEnabled == null) {
			dailyAlertEnabled = true;
		}

		if (includeZeroStockBatches == null) {
			includeZeroStockBatches = false;
		}

		if (autoQuarantineExpiredStock == null) {
			autoQuarantineExpiredStock = false;
		}

		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	@PreUpdate
	public void preUpdate() {
		updatedAt = LocalDateTime.now();
	}
}