package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_medicine_stock", indexes = {

		@Index(name = "idx_saas_stock_tenant", columnList = "tenant_id"),

		@Index(name = "idx_saas_stock_medicine", columnList = "tenant_id,medicine_id"),

		@Index(name = "idx_saas_stock_batch", columnList = "tenant_id,medicine_id,batch_number"),

		@Index(name = "idx_saas_stock_expiry", columnList = "tenant_id,expiry_date"),

		@Index(name = "idx_saas_stock_supplier", columnList = "tenant_id,supplier_id"),

		@Index(name = "idx_saas_stock_purchase", columnList = "tenant_id,purchase_id"),

		@Index(name = "idx_saas_stock_quarantine", columnList = "tenant_id,expiry_quarantined") })
@Data
@NoArgsConstructor
public class SaasMedicineStock {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "medicine_id", nullable = false)
	private Long medicineId;

	@Column(name = "medicine_name", length = 180)
	private String medicineName;

	@Column(name = "medicine_type", length = 100)
	private String medicineType;

	@Column(name = "manufacturer", length = 180)
	private String manufacturer;

	@Column(name = "batch_number", nullable = false, length = 100)
	private String batchNumber;

	@Column(name = "manufacturing_date")
	private LocalDate manufacturingDate;

	@Column(name = "expiry_date")
	private LocalDate expiryDate;

	@Column(name = "opening_quantity", nullable = false)
	private Integer openingQuantity = 0;

	@Column(name = "current_quantity", nullable = false)
	private Integer currentQuantity = 0;

	@Column(name = "quarantined_quantity", nullable = false)
	private Integer quarantinedQuantity = 0;

	@Column(name = "expiry_quarantined", nullable = false)
	private Boolean expiryQuarantined = false;

	@Column(name = "purchase_price", precision = 15, scale = 2)
	private BigDecimal purchasePrice = BigDecimal.ZERO;

	@Column(name = "sale_price", precision = 15, scale = 2)
	private BigDecimal salePrice = BigDecimal.ZERO;

	@Column(name = "mrp", precision = 15, scale = 2)
	private BigDecimal mrp = BigDecimal.ZERO;

	@Column(name = "gst_percentage", precision = 8, scale = 2)
	private BigDecimal gstPercentage = BigDecimal.ZERO;

	@Column(name = "supplier_id")
	private Long supplierId;

	@Column(name = "supplier_code", length = 50)
	private String supplierCode;

	@Column(name = "supplier_name", length = 180)
	private String supplierName;

	@Column(name = "last_purchase_id")
	private Long lastPurchaseId;

	@Column(name = "purchase_id")
	private Long purchaseId;

	@Column(name = "purchase_number", length = 100)
	private String purchaseNumber;

	@Column(name = "purchase_item_id")
	private Long purchaseItemId;

	@Column(name = "active", nullable = false)
	private Boolean active = true;

	@Column(name = "created_by_auth_user_id")
	private Long createdByAuthUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@PrePersist
	public void prePersist() {

		normalizeEntityValues();

		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	@PreUpdate
	public void preUpdate() {

		normalizeEntityValues();

		touch();
	}

	@Transient
	public BigDecimal getPurchaseRate() {

		return money(purchasePrice);
	}

	public void setPurchaseRate(BigDecimal purchaseRate) {

		this.purchasePrice = money(purchaseRate);
	}

	@Transient
	public BigDecimal getSaleRate() {

		return money(salePrice);
	}

	public void setSaleRate(BigDecimal saleRate) {

		this.salePrice = money(saleRate);
	}

	@Transient
	public Integer getAvailableQuantity() {

		int current = safeQuantity(currentQuantity);

		int quarantined = safeQuantity(quarantinedQuantity);

		return Math.max(current - quarantined, 0);
	}

	@Transient
	public Integer getSaleableQuantity() {

		if (expiryDate != null && !expiryDate.isAfter(LocalDate.now())) {

			return 0;
		}

		if (!Boolean.TRUE.equals(active)) {
			return 0;
		}

		return getAvailableQuantity();
	}

	@Transient
	public Boolean isExpired() {

		return expiryDate != null && expiryDate.isBefore(LocalDate.now());
	}

	@Transient
	public Boolean isExpiringToday() {

		return expiryDate != null && expiryDate.isEqual(LocalDate.now());
	}

	@Transient
	public Boolean hasSaleableStock() {

		return getSaleableQuantity() > 0;
	}

	public void increaseCurrentQuantity(Integer quantity) {

		int increaseBy = requirePositiveQuantity(quantity, "Increase quantity");

		this.currentQuantity = safeQuantity(this.currentQuantity) + increaseBy;

		touch();
	}

	public void decreaseCurrentQuantity(Integer quantity) {

		int decreaseBy = requirePositiveQuantity(quantity, "Decrease quantity");

		int available = getAvailableQuantity();

		if (decreaseBy > available) {

			throw new IllegalArgumentException(
					"Stock reduction quantity cannot exceed available non-quarantined quantity");
		}

		this.currentQuantity = safeQuantity(this.currentQuantity) - decreaseBy;

		normalizeQuarantineState();

		touch();
	}

	public void quarantineQuantity(Integer quantity) {

		int quarantineBy = requirePositiveQuantity(quantity, "Quarantine quantity");

		int available = getAvailableQuantity();

		if (quarantineBy > available) {

			throw new IllegalArgumentException("Quarantine quantity cannot exceed available stock");
		}

		this.quarantinedQuantity = safeQuantity(this.quarantinedQuantity) + quarantineBy;

		this.expiryQuarantined = this.quarantinedQuantity > 0;

		touch();
	}

	public void releaseQuarantinedQuantity(Integer quantity) {

		int releaseBy = requirePositiveQuantity(quantity, "Release quantity");

		int quarantined = safeQuantity(this.quarantinedQuantity);

		if (releaseBy > quarantined) {

			throw new IllegalArgumentException("Release quantity cannot exceed quarantined quantity");
		}

		this.quarantinedQuantity = quarantined - releaseBy;

		this.expiryQuarantined = this.quarantinedQuantity > 0;

		touch();
	}

	public void consumeQuarantinedQuantity(Integer quantity) {

		int consumeBy = requirePositiveQuantity(quantity, "Quarantined stock consumption quantity");

		int quarantined = safeQuantity(this.quarantinedQuantity);

		int current = safeQuantity(this.currentQuantity);

		if (consumeBy > quarantined) {

			throw new IllegalArgumentException("Quantity cannot exceed quarantined stock");
		}

		if (consumeBy > current) {

			throw new IllegalArgumentException("Quantity cannot exceed current physical stock");
		}

		this.quarantinedQuantity = quarantined - consumeBy;

		this.currentQuantity = current - consumeBy;

		this.expiryQuarantined = this.quarantinedQuantity > 0;

		touch();
	}

	public void touch() {

		this.updatedAt = LocalDateTime.now();
	}

	private void normalizeEntityValues() {

		openingQuantity = safeQuantity(openingQuantity);

		currentQuantity = safeQuantity(currentQuantity);

		quarantinedQuantity = safeQuantity(quarantinedQuantity);

		purchasePrice = money(purchasePrice);

		salePrice = money(salePrice);

		mrp = money(mrp);

		gstPercentage = percentage(gstPercentage);

		if (active == null) {
			active = true;
		}

		normalizeQuarantineState();

		normalizeTextFields();
	}

	private void normalizeQuarantineState() {

		int current = safeQuantity(currentQuantity);

		int quarantined = safeQuantity(quarantinedQuantity);

		if (quarantined > current) {
			quarantined = current;
		}

		this.currentQuantity = current;

		this.quarantinedQuantity = quarantined;

		this.expiryQuarantined = quarantined > 0;
	}

	private void normalizeTextFields() {

		medicineName = normalizeOptional(medicineName);

		medicineType = normalizeOptional(medicineType);

		manufacturer = normalizeOptional(manufacturer);

		batchNumber = normalizeOptional(batchNumber);

		supplierCode = normalizeOptional(supplierCode);

		supplierName = normalizeOptional(supplierName);

		purchaseNumber = normalizeOptional(purchaseNumber);
	}

	private int safeQuantity(Integer value) {

		if (value == null) {
			return 0;
		}

		return Math.max(value, 0);
	}

	private int requirePositiveQuantity(Integer value, String fieldName) {

		if (value == null || value <= 0) {

			throw new IllegalArgumentException(fieldName + " must be greater than 0");
		}

		return value;
	}

	private BigDecimal money(BigDecimal value) {

		return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal percentage(BigDecimal value) {

		BigDecimal normalized = money(value);

		if (normalized.compareTo(BigDecimal.ZERO) < 0) {

			return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		}

		return normalized;
	}

	private String normalizeOptional(String value) {

		if (value == null) {
			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}
}