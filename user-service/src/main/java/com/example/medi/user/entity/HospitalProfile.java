package com.example.medi.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.example.medi.user.enums.VerificationStatus;

@Entity
@Table(name = "hospital_profiles")
@Data
@NoArgsConstructor
public class HospitalProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long authUserId;

    @Column(nullable = false)
    private String hospitalName;

    private String registrationNumber;

    private String hospitalType;

    private Integer bedCapacity;

    private String email;

    private String mobile;

    private String address;

    private String state;

    private String district;

    private String pincode;

    private String contactPersonName;
    private String contactPersonMobile;

    private String bankName;
    private String accountHolderName;
    private String accountNumber;
    private String ifscCode;
    private String branchName;

    private String profileLogoUrl;
    private String documentUrl;

    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();
    
}
