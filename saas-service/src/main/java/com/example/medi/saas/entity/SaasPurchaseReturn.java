package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPurchaseReturnStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_purchase_returns", uniqueConstraints = {
		@UniqueConstraint(name = "uk_saas_purchase_return_number", columnNames = { "tenant_id",
				"return_number" }) }, indexes = {
						@Index(name = "idx_saas_purchase_return_tenant", columnList = "tenant_id"),
						@Index(name = "idx_saas_purchase_return_purchase", columnList = "tenant_id,purchase_id"),
						@Index(name = "idx_saas_purchase_return_supplier", columnList = "tenant_id,supplier_id"),
						@Index(name = "idx_saas_purchase_return_date", columnList = "tenant_id,return_date") })
@Data
@NoArgsConstructor
public class SaasPurchaseReturn {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "return_number", nullable = false, length = 80)
	private String returnNumber;

	@Column(name = "return_date", nullable = false)
	private LocalDate returnDate;

	@Column(name = "purchase_id", nullable = false)
	private Long purchaseId;

	@Column(name = "purchase_number", nullable = false, length = 80)
	private String purchaseNumber;

	@Column(name = "supplier_invoice_number", length = 100)
	private String supplierInvoiceNumber;

	@Column(name = "supplier_id", nullable = false)
	private Long supplierId;

	@Column(name = "supplier_code", length = 40)
	private String supplierCode;

	@Column(name = "supplier_name", nullable = false, length = 180)
	private String supplierName;

	@Column(name = "total_quantity", nullable = false)
	private Integer totalQuantity = 0;

	@Column(name = "gross_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal grossAmount = BigDecimal.ZERO;

	@Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal discountAmount = BigDecimal.ZERO;

	@Column(name = "taxable_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal taxableAmount = BigDecimal.ZERO;

	@Column(name = "gst_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal gstAmount = BigDecimal.ZERO;

	@Column(name = "other_charges", nullable = false, precision = 15, scale = 2)
	private BigDecimal otherCharges = BigDecimal.ZERO;

	@Column(name = "round_off_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal roundOffAmount = BigDecimal.ZERO;

	@Column(name = "grand_total", nullable = false, precision = 15, scale = 2)
	private BigDecimal grandTotal = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "return_status", nullable = false, length = 30)
	private SaasPurchaseReturnStatus returnStatus;

	@Column(name = "debit_note_number", length = 100)
	private String debitNoteNumber;

	@Column(length = 1000)
	private String remarks;

	@Column(name = "created_by_auth_user_id")
	private Long createdByAuthUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@PrePersist
	public void prePersist() {

		if (returnDate == null) {
			returnDate = LocalDate.now();
		}

		if (returnStatus == null) {
			returnStatus = SaasPurchaseReturnStatus.POSTED;
		}

		if (totalQuantity == null) {
			totalQuantity = 0;
		}

		if (grossAmount == null) {
			grossAmount = BigDecimal.ZERO;
		}

		if (discountAmount == null) {
			discountAmount = BigDecimal.ZERO;
		}

		if (taxableAmount == null) {
			taxableAmount = BigDecimal.ZERO;
		}

		if (gstAmount == null) {
			gstAmount = BigDecimal.ZERO;
		}

		if (otherCharges == null) {
			otherCharges = BigDecimal.ZERO;
		}

		if (roundOffAmount == null) {
			roundOffAmount = BigDecimal.ZERO;
		}

		if (grandTotal == null) {
			grandTotal = BigDecimal.ZERO;
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