package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_customers",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saas_customer_code",
                        columnNames = {
                                "tenant_id",
                                "customer_code"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_saas_customer_tenant",
                        columnList = "tenant_id"
                ),
                @Index(
                        name = "idx_saas_customer_name",
                        columnList = "tenant_id,customer_name"
                ),
                @Index(
                        name = "idx_saas_customer_mobile",
                        columnList = "tenant_id,mobile"
                ),
                @Index(
                        name = "idx_saas_customer_gstin",
                        columnList = "tenant_id,gstin"
                )
        }
)
@Data
@NoArgsConstructor
public class SaasCustomer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Workspace isolation.
     */
    @Column(
            name = "tenant_id",
            nullable = false
    )
    private Long tenantId;

    @Column(
            name = "customer_code",
            nullable = false,
            length = 40
    )
    private String customerCode;

    @Column(
            name = "customer_name",
            nullable = false,
            length = 180
    )
    private String customerName;

    /*
     * RETAIL, PHARMACY, HOSPITAL, CLINIC,
     * WHOLESALER, DISTRIBUTOR or OTHER.
     */
    @Column(
            name = "customer_type",
            nullable = false,
            length = 40
    )
    private String customerType;

    @Column(
            name = "contact_person_name",
            length = 160
    )
    private String contactPersonName;

    @Column(length = 20)
    private String mobile;

    @Column(
            name = "alternate_mobile",
            length = 20
    )
    private String alternateMobile;

    @Column(length = 180)
    private String email;

    @Column(length = 30)
    private String gstin;

    @Column(
            name = "drug_license_number",
            length = 100
    )
    private String drugLicenseNumber;

    @Column(length = 500)
    private String address;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String district;

    @Column(length = 120)
    private String state;

    @Column(length = 12)
    private String pincode;

    @Column(
            name = "opening_balance",
            precision = 15,
            scale = 2
    )
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(
            name = "credit_limit",
            precision = 15,
            scale = 2
    )
    private BigDecimal creditLimit = BigDecimal.ZERO;

    @Column(
            name = "payment_terms_days"
    )
    private Integer paymentTermsDays = 0;

    @Column(
            name = "discount_percentage",
            precision = 8,
            scale = 2
    )
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(
            name = "created_by_auth_user_id"
    )
    private Long createdByAuthUserId;

    @Column(
            name = "updated_by_auth_user_id"
    )
    private Long updatedByAuthUserId;

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

        if (active == null) {
            active = true;
        }

        if (openingBalance == null) {
            openingBalance = BigDecimal.ZERO;
        }

        if (creditLimit == null) {
            creditLimit = BigDecimal.ZERO;
        }

        if (paymentTermsDays == null) {
            paymentTermsDays = 0;
        }

        if (discountPercentage == null) {
            discountPercentage = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}