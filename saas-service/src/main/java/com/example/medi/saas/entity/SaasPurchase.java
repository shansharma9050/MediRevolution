package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPurchasePaymentStatus;
import com.example.medi.saas.enums.SaasPurchaseStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_purchases",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saas_purchase_number",
                        columnNames = {
                                "tenant_id",
                                "purchase_number"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_saas_purchase_tenant",
                        columnList = "tenant_id"
                ),
                @Index(
                        name = "idx_saas_purchase_supplier",
                        columnList = "tenant_id,supplier_id"
                ),
                @Index(
                        name = "idx_saas_purchase_date",
                        columnList = "tenant_id,purchase_date"
                ),
                @Index(
                        name = "idx_saas_purchase_invoice",
                        columnList = "tenant_id,supplier_invoice_number"
                )
        }
)
@Data
@NoArgsConstructor
public class SaasPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "tenant_id",
            nullable = false
    )
    private Long tenantId;

    @Column(
            name = "purchase_number",
            nullable = false,
            length = 80
    )
    private String purchaseNumber;

    @Column(
            name = "purchase_date",
            nullable = false
    )
    private LocalDate purchaseDate;

    @Column(
            name = "supplier_id",
            nullable = false
    )
    private Long supplierId;

    @Column(
            name = "supplier_code",
            length = 40
    )
    private String supplierCode;

    @Column(
            name = "supplier_name",
            nullable = false,
            length = 180
    )
    private String supplierName;

    @Column(
            name = "supplier_invoice_number",
            nullable = false,
            length = 100
    )
    private String supplierInvoiceNumber;

    @Column(name = "supplier_invoice_date")
    private LocalDate supplierInvoiceDate;

    @Column(
            name = "total_quantity",
            nullable = false
    )
    private Integer totalQuantity = 0;

    @Column(
            name = "total_free_quantity",
            nullable = false
    )
    private Integer totalFreeQuantity = 0;

    @Column(
            name = "gross_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal grossAmount = BigDecimal.ZERO;

    @Column(
            name = "discount_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(
            name = "taxable_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal taxableAmount = BigDecimal.ZERO;

    @Column(
            name = "gst_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(
            name = "other_charges",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal otherCharges = BigDecimal.ZERO;

    @Column(
            name = "round_off_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal roundOffAmount = BigDecimal.ZERO;

    @Column(
            name = "grand_total",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal grandTotal = BigDecimal.ZERO;

    @Column(
            name = "paid_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(
            name = "due_amount",
            precision = 15,
            scale = 2,
            nullable = false
    )
    private BigDecimal dueAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "payment_status",
            nullable = false,
            length = 30
    )
    private SaasPurchasePaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "purchase_status",
            nullable = false,
            length = 30
    )
    private SaasPurchaseStatus purchaseStatus;

    @Column(length = 1000)
    private String remarks;

    @Column(name = "created_by_auth_user_id")
    private Long createdByAuthUserId;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (purchaseDate == null) {
            purchaseDate = LocalDate.now();
        }

        if (purchaseStatus == null) {
            purchaseStatus = SaasPurchaseStatus.POSTED;
        }

        if (paymentStatus == null) {
            paymentStatus = SaasPurchasePaymentStatus.UNPAID;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}