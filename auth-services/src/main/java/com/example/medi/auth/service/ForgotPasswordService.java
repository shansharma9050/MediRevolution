package com.example.medi.auth.service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.medi.auth.entity.User;
import com.example.medi.auth.repository.UserRepository;

@Service
public class ForgotPasswordService {

    private final UserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final Map<String, ForgotPasswordOtpData> forgotPasswordOtpStore = new ConcurrentHashMap<>();

    public ForgotPasswordService(UserRepository authUserRepository,
                                 PasswordEncoder passwordEncoder,
                                 EmailService emailService) {
        this.authUserRepository = authUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public void sendForgotPasswordOtp(String email) {

        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        email = email.trim().toLowerCase();

        Optional<User> optionalUser = authUserRepository.findByEmail(email);

        if (optionalUser.isEmpty()) {
            throw new RuntimeException("No account found with this email");
        }

        String otp = generateOtp();

        ForgotPasswordOtpData otpData = new ForgotPasswordOtpData(
                otp,
                LocalDateTime.now().plusMinutes(10),
                false
        );

        forgotPasswordOtpStore.put(email, otpData);

        emailService.sendForgotPasswordOtpEmail(email, otp);
    }

    public void verifyForgotPasswordOtp(String email, String otp) {

        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        if (otp == null || otp.trim().isEmpty()) {
            throw new RuntimeException("OTP is required");
        }

        email = email.trim().toLowerCase();

        ForgotPasswordOtpData otpData = forgotPasswordOtpStore.get(email);

        if (otpData == null) {
            throw new RuntimeException("OTP not found. Please request new OTP.");
        }

        if (LocalDateTime.now().isAfter(otpData.getExpiryTime())) {
            forgotPasswordOtpStore.remove(email);
            throw new RuntimeException("OTP expired. Please request new OTP.");
        }

        if (!otpData.getOtp().equals(otp.trim())) {
            throw new RuntimeException("Invalid OTP");
        }

        otpData.setVerified(true);
        forgotPasswordOtpStore.put(email, otpData);
    }

    public void resetPassword(String email, String newPassword) {

        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }

        email = email.trim().toLowerCase();

        ForgotPasswordOtpData otpData = forgotPasswordOtpStore.get(email);

        if (otpData == null || !otpData.isVerified()) {
            throw new RuntimeException("OTP verification required before password reset");
        }

        if (LocalDateTime.now().isAfter(otpData.getExpiryTime())) {
            forgotPasswordOtpStore.remove(email);
            throw new RuntimeException("OTP expired. Please request new OTP again.");
        }

        User user = authUserRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));

        authUserRepository.save(user);

        forgotPasswordOtpStore.remove(email);
    }

    private String generateOtp() {
        int otp = (int) (Math.random() * 900000) + 100000;
        return String.valueOf(otp);
    }

    private static class ForgotPasswordOtpData {

        private String otp;
        private LocalDateTime expiryTime;
        private boolean verified;

        public ForgotPasswordOtpData(String otp, LocalDateTime expiryTime, boolean verified) {
            this.otp = otp;
            this.expiryTime = expiryTime;
            this.verified = verified;
        }

        public String getOtp() {
            return otp;
        }

        public LocalDateTime getExpiryTime() {
            return expiryTime;
        }

        public boolean isVerified() {
            return verified;
        }

        public void setVerified(boolean verified) {
            this.verified = verified;
        }
    }
}