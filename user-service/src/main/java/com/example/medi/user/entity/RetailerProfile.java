package com.example.medi.user.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.example.medi.user.enums.VerificationStatus;

@Entity
@Table(name = "retailer_profiles")
@Data
@NoArgsConstructor
public class RetailerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long authUserId;

    @Column(nullable = false)
    private String storeName;

    private String ownerName;

    private String drugLicenseNumber;

    private String gstNumber;

    private String email;

    private String mobile;

    private String address;

    private String state;

    private String district;

    private String pincode;

    private String documentUrl;

    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();
    
}

