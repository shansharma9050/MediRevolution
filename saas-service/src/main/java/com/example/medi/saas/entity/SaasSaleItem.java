package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_sale_items", indexes = { @Index(name = "idx_saas_sale_item_sale", columnList = "tenant_id,sale_id"),
		@Index(name = "idx_saas_sale_item_medicine", columnList = "tenant_id,medicine_id") })
@Data
@NoArgsConstructor
public class SaasSaleItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "sale_id", nullable = false)
	private Long saleId;

	@Column(name = "medicine_id", nullable = false)
	private Long medicineId;

	@Column(name = "medicine_name", nullable = false, length = 160)
	private String medicineName;

	@Column(name = "medicine_type", length = 80)
	private String medicineType;

	@Column(name = "manufacturer", length = 120)
	private String manufacturer;

	@Column(nullable = false)
	private Integer quantity;

	@Column(name = "sale_rate", nullable = false, precision = 15, scale = 2)
	private BigDecimal saleRate;

	@Column(name = "gross_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal grossAmount;

	@Column(name = "discount_percentage", nullable = false, precision = 8, scale = 2)
	private BigDecimal discountPercentage;

	@Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal discountAmount;

	@Column(name = "taxable_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal taxableAmount;

	@Column(name = "gst_percentage", nullable = false, precision = 8, scale = 2)
	private BigDecimal gstPercentage;

	@Column(name = "gst_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal gstAmount;

	@Column(name = "line_total", nullable = false, precision = 15, scale = 2)
	private BigDecimal lineTotal;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {

		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}
}