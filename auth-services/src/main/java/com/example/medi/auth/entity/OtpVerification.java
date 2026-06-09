package com.example.medi.auth.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "otp_verifications")
@Data
@NoArgsConstructor
public class OtpVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String identifier; 
    // email or mobile

    private String otp;

    private String otpType;
    // EMAIL or MOBILE

    private LocalDateTime expiryTime;

    private LocalDateTime createdAt;

    private boolean verified;

    private int attempts;

    private int resendCount;

    private LocalDateTime resendWindowStart;

}