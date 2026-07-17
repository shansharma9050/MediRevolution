package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_suppliers",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saas_supplier_code",
                        columnNames = {
                                "tenant_id",
                                "supplier_code"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_saas_supplier_tenant",
                        columnList = "tenant_id"
                ),
                @Index(
                        name = "idx_saas_supplier_name",
                        columnList = "tenant_id,supplier_name"
                ),
                @Index(
                        name = "idx_saas_supplier_mobile",
                        columnList = "tenant_id,mobile"
                )
        }
)
@Data
@NoArgsConstructor
public class SaasSupplier {

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
            name = "supplier_code",
            nullable = false,
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
            name = "contact_person_name",
            length = 160
    )
    private String contactPersonName;

    @Column(length = 20)
    private String mobile;

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
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}