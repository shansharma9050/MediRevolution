package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPurchaseReturnReason;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_purchase_return_items",
        indexes = {
                @Index(
                        name = "idx_saas_purchase_return_item_return",
                        columnList = "tenant_id,purchase_return_id"
                ),
                @Index(
                        name = "idx_saas_purchase_return_item_purchase",
                        columnList = "tenant_id,purchase_id"
                ),
                @Index(
                        name = "idx_saas_purchase_return_item_purchase_item",
                        columnList = "tenant_id,purchase_item_id"
                ),
                @Index(
                        name = "idx_saas_purchase_return_item_stock",
                        columnList = "tenant_id,stock_id"
                )
        }
)
@Data
@NoArgsConstructor
public class SaasPurchaseReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "tenant_id",
            nullable = false
    )
    private Long tenantId;

    @Column(
            name = "purchase_return_id",
            nullable = false
    )
    private Long purchaseReturnId;

    @Column(
            name = "purchase_id",
            nullable = false
    )
    private Long purchaseId;

    @Column(
            name = "purchase_item_id",
            nullable = false
    )
    private Long purchaseItemId;

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
            name = "stock_id",
            nullable = false
    )
    private Long stockId;

    @Column(
            name = "batch_number",
            nullable = false,
            length = 100
    )
    private String batchNumber;

    @Column(
            name = "expiry_date"
    )
    private LocalDate expiryDate;

    @Column(
            name = "return_quantity",
            nullable = false
    )
    private Integer returnQuantity;

    @Column(
            name = "purchase_rate",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal purchaseRate;

    @Column(
            name = "gross_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal grossAmount;

    @Column(
            name = "discount_percentage",
            nullable = false,
            precision = 8,
            scale = 2
    )
    private BigDecimal discountPercentage;

    @Column(
            name = "discount_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal discountAmount;

    @Column(
            name = "taxable_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal taxableAmount;

    @Column(
            name = "gst_percentage",
            nullable = false,
            precision = 8,
            scale = 2
    )
    private BigDecimal gstPercentage;

    @Column(
            name = "gst_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal gstAmount;

    @Column(
            name = "line_total",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal lineTotal;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "return_reason",
            nullable = false,
            length = 40
    )
    private SaasPurchaseReturnReason returnReason;

    @Column(
            name = "reason_details",
            length = 500
    )
    private String reasonDetails;

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