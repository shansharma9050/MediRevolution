package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasSalePaymentStatus;
import com.example.medi.saas.enums.SaasSaleStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_sales", uniqueConstraints = {
		@UniqueConstraint(name = "uk_saas_sale_number", columnNames = { "tenant_id", "sale_number" }) }, indexes = {
				@Index(name = "idx_saas_sale_tenant", columnList = "tenant_id"),
				@Index(name = "idx_saas_sale_customer", columnList = "tenant_id,customer_id"),
				@Index(name = "idx_saas_sale_date", columnList = "tenant_id,sale_date") })
@Data
@NoArgsConstructor
public class SaasSale {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "sale_number", nullable = false, length = 80)
	private String saleNumber;

	@Column(name = "sale_date", nullable = false)
	private LocalDate saleDate;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "customer_code", length = 40)
	private String customerCode;

	@Column(name = "customer_name", nullable = false, length = 180)
	private String customerName;

	@Column(name = "customer_type", length = 40)
	private String customerType;

	@Column(name = "customer_gstin", length = 30)
	private String customerGstin;

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

	@Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal paidAmount = BigDecimal.ZERO;

	@Column(name = "due_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal dueAmount = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_status", nullable = false, length = 30)
	private SaasSalePaymentStatus paymentStatus;

	@Enumerated(EnumType.STRING)
	@Column(name = "sale_status", nullable = false, length = 30)
	private SaasSaleStatus saleStatus;

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

		if (saleDate == null) {
			saleDate = LocalDate.now();
		}

		if (paymentStatus == null) {
			paymentStatus = SaasSalePaymentStatus.UNPAID;
		}

		if (saleStatus == null) {
			saleStatus = SaasSaleStatus.POSTED;
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