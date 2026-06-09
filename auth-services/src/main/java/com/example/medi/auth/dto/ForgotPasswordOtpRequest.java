package com.example.medi.auth.dto;

public class ForgotPasswordOtpRequest {

    private String email;

    public ForgotPasswordOtpRequest() {
    }

    public ForgotPasswordOtpRequest(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
