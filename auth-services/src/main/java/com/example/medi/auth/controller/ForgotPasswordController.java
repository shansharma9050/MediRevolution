package com.example.medi.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.medi.auth.dto.ApiResponse;
import com.example.medi.auth.dto.ForgotPasswordOtpRequest;
import com.example.medi.auth.dto.ResetPasswordRequest;
import com.example.medi.auth.dto.VerifyForgotPasswordOtpRequest;
import com.example.medi.auth.service.ForgotPasswordService;

@RestController
@RequestMapping("/auth/forgot-password")
public class ForgotPasswordController {

    private final ForgotPasswordService forgotPasswordService;

    public ForgotPasswordController(ForgotPasswordService forgotPasswordService) {
        this.forgotPasswordService = forgotPasswordService;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse> sendForgotPasswordOtp(
            @RequestBody ForgotPasswordOtpRequest request) {

        try {
            forgotPasswordService.sendForgotPasswordOtp(request.getEmail());

            return ResponseEntity.ok(
                    ApiResponse.success("OTP sent successfully to your registered email")
            );

        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse> verifyForgotPasswordOtp(
            @RequestBody VerifyForgotPasswordOtpRequest request) {

        try {
            forgotPasswordService.verifyForgotPasswordOtp(
                    request.getEmail(),
                    request.getOtp()
            );

            return ResponseEntity.ok(
                    ApiResponse.success("OTP verified successfully")
            );

        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<ApiResponse> resetPassword(
            @RequestBody ResetPasswordRequest request) {

        try {
            forgotPasswordService.resetPassword(
                    request.getEmail(),
                    request.getNewPassword()
            );

            return ResponseEntity.ok(
                    ApiResponse.success("Password reset successfully")
            );

        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}