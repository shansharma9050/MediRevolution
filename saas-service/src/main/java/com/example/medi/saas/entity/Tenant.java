package com.example.medi.saas.entity;

import com.example.medi.saas.enums.TenantStatus;
import com.example.medi.saas.enums.TenantType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_tenants")
@Data
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long ownerAuthUserId;

    @Column(nullable = false, length = 120)
    private String tenantName;

    @Column(nullable = false, unique = true, length = 80)
    private String tenantCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TenantType tenantType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TenantStatus status = TenantStatus.ACTIVE;

    private String contactEmail;

    private String contactMobile;

    private String address;

    private String city;

    private String state;

    private String pincode;

    private String logoUrl;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
