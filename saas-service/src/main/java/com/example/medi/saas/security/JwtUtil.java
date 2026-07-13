package com.example.medi.saas.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public Long extractUserId(String token) {
        Claims claims = extractClaims(token);
        Object userId = claims.get("userId");

        if (userId == null) {
            return null;
        }

        return Long.valueOf(userId.toString());
    }

    public String extractRole(String token) {
        Claims claims = extractClaims(token);
        Object role = claims.get("role");
        return role == null ? null : role.toString();
    }

    public String extractEmail(String token) {
        Claims claims = extractClaims(token);
        Object email = claims.get("email");
        return email == null ? null : email.toString();
    }

    public String extractUserName(String token) {
        Claims claims = extractClaims(token);
        Object userName = claims.get("userName");
        return userName == null ? null : userName.toString();
    }
}