package com.example.medi.auth.service;

import java.time.LocalDateTime;
import java.util.Random;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.medi.auth.constant.OtpType;
import com.example.medi.auth.entity.OtpVerification;
import com.example.medi.auth.repository.OtpVerificationRepository;

@Service
public class OtpService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_RESEND_COUNT = 3;
    private static final int RESEND_WINDOW_MINUTES = 10;
    private static final int MAX_WRONG_ATTEMPTS = 5;

    private final OtpVerificationRepository otpRepository;
    private final EmailService emailService;

    public OtpService(
            OtpVerificationRepository otpRepository,
            EmailService emailService
    ) {
        this.otpRepository = otpRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void sendEmailOtp(String email) {

        String normalizedEmail = email.trim().toLowerCase();

        OtpVerification latestOtp = otpRepository
                .findTopByIdentifierAndOtpTypeOrderByCreatedAtDesc(normalizedEmail, OtpType.EMAIL)
                .orElse(null);

        validateRateLimit(latestOtp);

        String otp = generateOtp();

        OtpVerification otpVerification = new OtpVerification();
        otpVerification.setIdentifier(normalizedEmail);
        otpVerification.setOtp(otp);
        otpVerification.setOtpType(OtpType.EMAIL);
        otpVerification.setCreatedAt(LocalDateTime.now());
        otpVerification.setExpiryTime(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        otpVerification.setVerified(false);
        otpVerification.setAttempts(0);

        if (latestOtp == null || latestOtp.getResendWindowStart() == null
                || latestOtp.getResendWindowStart().plusMinutes(RESEND_WINDOW_MINUTES).isBefore(LocalDateTime.now())) {

            otpVerification.setResendWindowStart(LocalDateTime.now());
            otpVerification.setResendCount(1);

        } else {
            otpVerification.setResendWindowStart(latestOtp.getResendWindowStart());
            otpVerification.setResendCount(latestOtp.getResendCount() + 1);
        }

        otpRepository.save(otpVerification);

        emailService.sendOtpEmail(normalizedEmail, otp);
    }

    @Transactional
    public boolean verifyEmailOtp(String email, String otp) {

        String normalizedEmail = email.trim().toLowerCase();

        OtpVerification otpVerification = otpRepository
                .findTopByIdentifierAndOtpTypeOrderByCreatedAtDesc(normalizedEmail, OtpType.EMAIL)
                .orElseThrow(() -> new RuntimeException("OTP not found. Please request new OTP."));

        if (otpVerification.isVerified()) {
            return true;
        }

        if (otpVerification.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP expired. Please request new OTP.");
        }

        if (otpVerification.getAttempts() >= MAX_WRONG_ATTEMPTS) {
            throw new RuntimeException("Maximum OTP attempts exceeded. Please request new OTP.");
        }

        if (!otpVerification.getOtp().equals(otp)) {
            otpVerification.setAttempts(otpVerification.getAttempts() + 1);
            otpRepository.save(otpVerification);

            int remainingAttempts = MAX_WRONG_ATTEMPTS - otpVerification.getAttempts();

            throw new RuntimeException("Invalid OTP. Remaining attempts: " + remainingAttempts);
        }

        otpVerification.setVerified(true);
        otpRepository.save(otpVerification);

        return true;
    }

    private void validateRateLimit(OtpVerification latestOtp) {

        if (latestOtp == null || latestOtp.getResendWindowStart() == null) {
            return;
        }

        LocalDateTime windowEnd = latestOtp.getResendWindowStart().plusMinutes(RESEND_WINDOW_MINUTES);

        if (windowEnd.isAfter(LocalDateTime.now())
                && latestOtp.getResendCount() >= MAX_RESEND_COUNT) {

            throw new RuntimeException("OTP limit exceeded. Please try again after 10 minutes.");
        }
    }

    private String generateOtp() {
        return String.valueOf(100000 + new Random().nextInt(900000));
    }
    
    public boolean isVerified(String identifier, String otpType) {

        return otpRepository
                .findTopByIdentifierAndOtpTypeOrderByCreatedAtDesc(identifier, otpType)
                .map(OtpVerification::isVerified)
                .orElse(false);
    }
}