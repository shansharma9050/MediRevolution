package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_sale_stock_allocations", indexes = {
		@Index(name = "idx_sale_allocation_sale", columnList = "tenant_id,sale_id"),
		@Index(name = "idx_sale_allocation_item", columnList = "tenant_id,sale_item_id"),
		@Index(name = "idx_sale_allocation_stock", columnList = "tenant_id,stock_id") })
@Data
@NoArgsConstructor
public class SaasSaleStockAllocation {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "sale_id", nullable = false)
	private Long saleId;

	@Column(name = "sale_item_id", nullable = false)
	private Long saleItemId;

	@Column(name = "medicine_id", nullable = false)
	private Long medicineId;

	@Column(name = "stock_id", nullable = false)
	private Long stockId;

	@Column(name = "batch_number", nullable = false, length = 100)
	private String batchNumber;

	@Column(name = "expiry_date")
	private LocalDate expiryDate;

	@Column(name = "allocated_quantity", nullable = false)
	private Integer allocatedQuantity;

	@Column(name = "purchase_price", nullable = false, precision = 15, scale = 2)
	private BigDecimal purchasePrice;

	@Column(name = "sale_rate", nullable = false, precision = 15, scale = 2)
	private BigDecimal saleRate;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {

		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}
}