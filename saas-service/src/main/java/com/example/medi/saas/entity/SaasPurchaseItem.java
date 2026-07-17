package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_purchase_items",
        indexes = {
                @Index(
                        name = "idx_saas_purchase_item_purchase",
                        columnList = "tenant_id,purchase_id"
                ),
                @Index(
                        name = "idx_saas_purchase_item_medicine",
                        columnList = "tenant_id,medicine_id"
                ),
                @Index(
                        name = "idx_saas_purchase_item_batch",
                        columnList = "tenant_id,medicine_id,batch_number"
                )
        }
)
@Data
@NoArgsConstructor
public class SaasPurchaseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "tenant_id",
            nullable = false
    )
    private Long tenantId;

    @Column(
            name = "purchase_id",
            nullable = false
    )
    private Long purchaseId;

    @Column(
            name = "medicine_id",
            nullable = false
    )
    private Long medicineId;

    @Column(
            name = "medicine_name",
            nullable = false,
            length = 160
    )
    private String medicineName;

    @Column(
            name = "medicine_type",
            length = 80
    )
    private String medicineType;

    @Column(
            name = "manufacturer",
            length = 120
    )
    private String manufacturer;

    @Column(
            name = "batch_number",
            nullable = false,
            length = 100
    )
    private String batchNumber;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(
            name = "expiry_date",
            nullable = false
    )
    private LocalDate expiryDate;

    @Column(nullable = false)
    private Integer quantity;

    @Column(
            name = "free_quantity",
            nullable = false
    )
    private Integer freeQuantity = 0;

    @Column(
            name = "purchase_rate",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal purchaseRate;

    @Column(
            name = "sale_rate",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal saleRate;

    @Column(
            name = "mrp",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal mrp;

    @Column(
            name = "gross_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal grossAmount;

    @Column(
            name = "discount_percentage",
            precision = 8,
            scale = 2,
            nullable = false
    )
    private BigDecimal discountPercentage;

    @Column(
            name = "discount_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal discountAmount;

    @Column(
            name = "taxable_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal taxableAmount;

    @Column(
            name = "gst_percentage",
            precision = 8,
            scale = 2,
            nullable = false
    )
    private BigDecimal gstPercentage;

    @Column(
            name = "gst_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal gstAmount;

    @Column(
            name = "line_total",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal lineTotal;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}