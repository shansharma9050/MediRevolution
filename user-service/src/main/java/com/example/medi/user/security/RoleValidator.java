package com.example.medi.user.security;

import org.springframework.security.access.AccessDeniedException;

public class RoleValidator {

    public static void allowOnly(String requiredRole) {
        String currentRole = CurrentUserUtil.getRole();

        if (!requiredRole.equals(currentRole)) {
            throw new AccessDeniedException(
                    "Only " + requiredRole + " can perform this action"
            );
        }
    }

    public static void allowAny(String... allowedRoles) {
        String currentRole = CurrentUserUtil.getRole();

        for (String role : allowedRoles) {
            if (role.equals(currentRole)) {
                return;
            }
        }

        throw new AccessDeniedException(
                "You do not have permission to perform this action"
        );
    }
}
