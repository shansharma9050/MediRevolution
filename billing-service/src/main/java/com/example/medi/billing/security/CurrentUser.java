package com.example.medi.billing.security;

public class CurrentUser {

    private Long userId;
    private String role;
    private String email;

    public CurrentUser(Long userId, String role, String email) {
        this.userId = userId;
        this.role = role;
        this.email = email;
    }

    public Long getUserId() {
        return userId;
    }

    public String getRole() {
        return role;
    }

    public String getEmail() {
        return email;
    }
}