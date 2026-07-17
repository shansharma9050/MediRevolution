package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasExpiryActionStatus;
import com.example.medi.saas.enums.SaasExpiryActionType;
import com.example.medi.saas.enums.SaasExpiryAdjustmentReason;
import com.example.medi.saas.enums.SaasExpiryDisposalMethod;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_expiry_actions", uniqueConstraints = {
		@UniqueConstraint(name = "uk_saas_expiry_action_number", columnNames = { "tenant_id",
				"action_number" }) }, indexes = {
						@Index(name = "idx_saas_expiry_action_tenant", columnList = "tenant_id"),
						@Index(name = "idx_saas_expiry_action_stock", columnList = "tenant_id,stock_id"),
						@Index(name = "idx_saas_expiry_action_medicine", columnList = "tenant_id,medicine_id"),
						@Index(name = "idx_saas_expiry_action_supplier", columnList = "tenant_id,supplier_id"),
						@Index(name = "idx_saas_expiry_action_date", columnList = "tenant_id,action_date"),
						@Index(name = "idx_saas_expiry_action_type", columnList = "tenant_id,action_type") })
@Data
@NoArgsConstructor
public class SaasExpiryAction {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "action_number", nullable = false, length = 80)
	private String actionNumber;

	@Column(name = "action_date", nullable = false)
	private LocalDate actionDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "action_type", nullable = false, length = 50)
	private SaasExpiryActionType actionType;

	@Enumerated(EnumType.STRING)
	@Column(name = "action_status", nullable = false, length = 30)
	private SaasExpiryActionStatus actionStatus;

	@Column(name = "stock_id", nullable = false)
	private Long stockId;

	@Column(name = "medicine_id", nullable = false)
	private Long medicineId;

	@Column(name = "medicine_name", nullable = false, length = 180)
	private String medicineName;

	@Column(name = "batch_number", nullable = false, length = 100)
	private String batchNumber;

	@Column(name = "expiry_date")
	private LocalDate expiryDate;

	@Column(name = "supplier_id")
	private Long supplierId;

	@Column(name = "supplier_code", length = 50)
	private String supplierCode;

	@Column(name = "supplier_name", length = 180)
	private String supplierName;

	@Column(name = "purchase_id")
	private Long purchaseId;

	@Column(name = "purchase_number", length = 100)
	private String purchaseNumber;

	@Column(name = "purchase_item_id")
	private Long purchaseItemId;

	@Column(name = "quantity_before", nullable = false)
	private Integer quantityBefore = 0;

	@Column(name = "action_quantity", nullable = false)
	private Integer actionQuantity = 0;

	@Column(name = "quantity_after", nullable = false)
	private Integer quantityAfter = 0;

	@Column(name = "purchase_rate", nullable = false, precision = 15, scale = 2)
	private BigDecimal purchaseRate = BigDecimal.ZERO;

	@Column(name = "stock_value", nullable = false, precision = 15, scale = 2)
	private BigDecimal stockValue = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "disposal_method", length = 50)
	private SaasExpiryDisposalMethod disposalMethod;

	@Enumerated(EnumType.STRING)
	@Column(name = "adjustment_reason", length = 50)
	private SaasExpiryAdjustmentReason adjustmentReason;

	@Column(name = "purchase_return_id")
	private Long purchaseReturnId;

	@Column(name = "purchase_return_number", length = 100)
	private String purchaseReturnNumber;

	@Column(name = "reference_number", length = 120)
	private String referenceNumber;

	@Column(name = "authorized_by", length = 180)
	private String authorizedBy;

	@Column(name = "witness_name", length = 180)
	private String witnessName;

	@Column(name = "disposal_location", length = 300)
	private String disposalLocation;

	@Column(name = "reason_details", length = 1000)
	private String reasonDetails;

	@Column(name = "remarks", length = 1000)
	private String remarks;

	@Column(name = "created_by_auth_user_id")
	private Long createdByAuthUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@PrePersist
	public void prePersist() {

		if (actionDate == null) {
			actionDate = LocalDate.now();
		}

		if (actionStatus == null) {
			actionStatus = SaasExpiryActionStatus.POSTED;
		}

		if (quantityBefore == null) {
			quantityBefore = 0;
		}

		if (actionQuantity == null) {
			actionQuantity = 0;
		}

		if (quantityAfter == null) {
			quantityAfter = 0;
		}

		if (purchaseRate == null) {
			purchaseRate = BigDecimal.ZERO;
		}

		if (stockValue == null) {
			stockValue = BigDecimal.ZERO;
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