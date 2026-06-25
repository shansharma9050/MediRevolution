package com.example.medi.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.example.medi.user.enums.VerificationStatus;

@Entity
@Table(name = "doctor_profiles")
@Data
@NoArgsConstructor
public class DoctorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long authUserId;

    @Column(nullable = false)
    private String doctorName;

    private String registrationNumber;

    private String specialization;

    private Double experienceYears;

    private String hospitalName;

    private String email;

    private String mobile;

    private String address;

    private String state;

    private String district;

    private String pincode;

    private String clinicName;
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
