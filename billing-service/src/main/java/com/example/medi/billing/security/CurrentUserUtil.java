package com.example.medi.billing.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class CurrentUserUtil {
    
    private final JwtUtil jwtUtil;

    public CurrentUserUtil(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    public static Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            throw new RuntimeException("User not authenticated");
        }

        Object details = authentication.getDetails();

        if (details instanceof Long userId) {
            return userId;
        }

        throw new RuntimeException("User ID not found in authentication details");
    }

    public static String getRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getAuthorities().isEmpty()) {
            throw new RuntimeException("User role not found");
        }

        return authentication.getAuthorities()
                .iterator()
                .next()
                .getAuthority()
                .replace("ROLE_", "");
    }

    public static String getAuthorizationHeader() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attributes == null) {
            throw new RuntimeException("Request context not found");
        }

        return attributes.getRequest().getHeader("Authorization");
    }

    public CurrentUser getCurrentUser(HttpServletRequest request) {
        String token = request.getHeader("Authorization");

        if (token == null || token.isBlank()) {
            throw new RuntimeException("Authorization token missing");
        }

        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        Long userId = jwtUtil.extractUserId(token);
        String role = jwtUtil.extractRole(token);
        String email = jwtUtil.extractEmail(token);

        if (userId == null) {
            throw new RuntimeException("Invalid token: userId missing");
        }

        if (role == null || role.isBlank()) {
            throw new RuntimeException("Invalid token: role missing");
        }

        return new CurrentUser(userId, role, email);
    }
}