package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasSalesOrderStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_sales_orders", uniqueConstraints = {
		@UniqueConstraint(name = "uk_saas_sales_order_number", columnNames = { "tenant_id",
				"order_number" }) }, indexes = { @Index(name = "idx_saas_sales_order_tenant", columnList = "tenant_id"),
						@Index(name = "idx_saas_sales_order_customer", columnList = "tenant_id,customer_id"),
						@Index(name = "idx_saas_sales_order_date", columnList = "tenant_id,order_date"),
						@Index(name = "idx_saas_sales_order_status", columnList = "tenant_id,order_status") })
@Data
@NoArgsConstructor
public class SaasSalesOrder {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "order_number", nullable = false, length = 80)
	private String orderNumber;

	@Column(name = "order_date", nullable = false)
	private LocalDate orderDate;

	@Column(name = "expected_delivery_date")
	private LocalDate expectedDeliveryDate;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "customer_code", length = 40)
	private String customerCode;

	@Column(name = "customer_name", nullable = false, length = 180)
	private String customerName;

	@Column(name = "customer_type", length = 40)
	private String customerType;

	@Column(name = "customer_mobile", length = 20)
	private String customerMobile;

	@Column(name = "customer_gstin", length = 30)
	private String customerGstin;

	@Column(name = "shipping_address", length = 1000)
	private String shippingAddress;

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
	@Column(name = "order_status", nullable = false, length = 40)
	private SaasSalesOrderStatus orderStatus;

	@Column(name = "converted_sale_id")
	private Long convertedSaleId;

	@Column(name = "converted_sale_number", length = 80)
	private String convertedSaleNumber;

	@Column(name = "rejection_reason", length = 500)
	private String rejectionReason;

	@Column(name = "cancellation_reason", length = 500)
	private String cancellationReason;

	@Column(length = 1000)
	private String remarks;

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

		if (orderDate == null) {
			orderDate = LocalDate.now();
		}

		if (orderStatus == null) {
			orderStatus = SaasSalesOrderStatus.PENDING;
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