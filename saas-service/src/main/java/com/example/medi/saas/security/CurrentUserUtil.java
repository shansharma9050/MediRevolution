package com.example.medi.saas.security;

import java.util.Base64;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class CurrentUserUtil {
	
    private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE = new ThreadLocal<>();
    private static final ThreadLocal<String> EMAIL = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_NAME = new ThreadLocal<>();
	
	
	 private final HttpServletRequest request;
	    private final ObjectMapper objectMapper;

	    public CurrentUserUtil(HttpServletRequest request, ObjectMapper objectMapper) {
	        this.request = request;
	        this.objectMapper = objectMapper;
	    }

	    public Long getCurrentAuthUserId() {
	        try {
	            String authorization = request.getHeader("Authorization");

	            if (authorization == null || !authorization.startsWith("Bearer ")) {
	                return null;
	            }

	            String token = authorization.substring(7);
	            String[] parts = token.split("\\.");

	            if (parts.length != 3) {
	                return null;
	            }

	            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]));

	            Map<String, Object> payload = objectMapper.readValue(payloadJson, Map.class);

	            Object userId = payload.get("userId");

	            if (userId == null) {
	                return null;
	            }

	            return Long.valueOf(String.valueOf(userId));

	        } catch (Exception e) {
	            return null;
	        }
	    }



    public static void set(Long userId, String role, String email, String userName) {
        USER_ID.set(userId);
        ROLE.set(role);
        EMAIL.set(email);
        USER_NAME.set(userName);
    }

    public static Long getUserId() {
        return USER_ID.get();
    }

    public static String getRole() {
        return ROLE.get();
    }

    public static String getEmail() {
        return EMAIL.get();
    }

    public static String getUserName() {
        return USER_NAME.get();
    }

    public static void clear() {
        USER_ID.remove();
        ROLE.remove();
        EMAIL.remove();
        USER_NAME.remove();
    }
}