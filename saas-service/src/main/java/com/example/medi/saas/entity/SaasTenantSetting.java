package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_tenant_settings")
@Data
public class SaasTenantSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * One settings row per tenant.
     */
    @Column(nullable = false, unique = true)
    private Long tenantId;

    @Column(length = 180)
    private String businessName;

    @Column(length = 80)
    private String businessType;

    @Column(length = 500)
    private String logoUrl;

    @Column(length = 500)
    private String address;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String state;

    @Column(length = 20)
    private String pincode;

    @Column(length = 120)
    private String country;

    @Column(length = 120)
    private String contactEmail;

    @Column(length = 30)
    private String contactMobile;

    @Column(length = 120)
    private String website;

    @Column(length = 80)
    private String gstNumber;

    @Column(length = 80)
    private String registrationNumber;

    @Column(length = 20)
    private String themeColor = "#05285f";

    @Column(length = 1000)
    private String invoiceHeader;

    @Column(length = 1000)
    private String invoiceFooter;

    @Column(length = 1000)
    private String prescriptionHeader;

    @Column(length = 1000)
    private String prescriptionFooter;

    @Column(length = 1000)
    private String reportHeader;

    @Column(length = 1000)
    private String reportFooter;

    @Column(length = 80)
    private String workingDays;

    @Column(length = 80)
    private String openingTime;

    @Column(length = 80)
    private String closingTime;

    private Boolean active = true;

    private Long updatedByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}