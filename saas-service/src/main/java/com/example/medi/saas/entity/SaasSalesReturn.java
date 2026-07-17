package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasSalesReturnRefundStatus;
import com.example.medi.saas.enums.SaasSalesReturnStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_sales_returns",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saas_sales_return_number",
                        columnNames = {
                                "tenant_id",
                                "return_number"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_saas_sales_return_tenant",
                        columnList = "tenant_id"
                ),
                @Index(
                        name = "idx_saas_sales_return_sale",
                        columnList = "tenant_id,sale_id"
                ),
                @Index(
                        name = "idx_saas_sales_return_customer",
                        columnList = "tenant_id,customer_id"
                ),
                @Index(
                        name = "idx_saas_sales_return_date",
                        columnList = "tenant_id,return_date"
                )
        }
)
@Data
@NoArgsConstructor
public class SaasSalesReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "tenant_id",
            nullable = false
    )
    private Long tenantId;

    @Column(
            name = "return_number",
            nullable = false,
            length = 80
    )
    private String returnNumber;

    @Column(
            name = "return_date",
            nullable = false
    )
    private LocalDate returnDate;

    @Column(
            name = "sale_id",
            nullable = false
    )
    private Long saleId;

    @Column(
            name = "sale_number",
            nullable = false,
            length = 80
    )
    private String saleNumber;

    @Column(
            name = "sale_date"
    )
    private LocalDate saleDate;

    @Column(
            name = "customer_id",
            nullable = false
    )
    private Long customerId;

    @Column(
            name = "customer_code",
            length = 40
    )
    private String customerCode;

    @Column(
            name = "customer_name",
            nullable = false,
            length = 180
    )
    private String customerName;

    @Column(
            name = "customer_gstin",
            length = 30
    )
    private String customerGstin;

    @Column(
            name = "credit_note_number",
            length = 100
    )
    private String creditNoteNumber;

    @Column(
            name = "total_quantity",
            nullable = false
    )
    private Integer totalQuantity = 0;

    @Column(
            name = "gross_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal grossAmount = BigDecimal.ZERO;

    @Column(
            name = "discount_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(
            name = "taxable_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal taxableAmount = BigDecimal.ZERO;

    @Column(
            name = "gst_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(
            name = "other_adjustment",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal otherAdjustment = BigDecimal.ZERO;

    @Column(
            name = "round_off_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal roundOffAmount = BigDecimal.ZERO;

    @Column(
            name = "grand_total",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal grandTotal = BigDecimal.ZERO;

    @Column(
            name = "refunded_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    @Column(
            name = "pending_refund_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal pendingRefundAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "refund_status",
            nullable = false,
            length = 40
    )
    private SaasSalesReturnRefundStatus refundStatus;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "return_status",
            nullable = false,
            length = 30
    )
    private SaasSalesReturnStatus returnStatus;

    @Column(length = 1000)
    private String remarks;

    @Column(
            name = "created_by_auth_user_id"
    )
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

        if (returnDate == null) {
            returnDate = LocalDate.now();
        }

        if (returnStatus == null) {
            returnStatus = SaasSalesReturnStatus.POSTED;
        }

        if (refundStatus == null) {
            refundStatus = SaasSalesReturnRefundStatus.NOT_REFUNDED;
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

        if (otherAdjustment == null) {
            otherAdjustment = BigDecimal.ZERO;
        }

        if (roundOffAmount == null) {
            roundOffAmount = BigDecimal.ZERO;
        }

        if (grandTotal == null) {
            grandTotal = BigDecimal.ZERO;
        }

        if (refundedAmount == null) {
            refundedAmount = BigDecimal.ZERO;
        }

        if (pendingRefundAmount == null) {
            pendingRefundAmount = BigDecimal.ZERO;
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