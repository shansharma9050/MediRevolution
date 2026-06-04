package com.example.medi.hospital.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class CurrentUserUtil {

	 public static Long getUserId() {
	        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
	        return (Long) authentication.getDetails();
	    }

	    public static String getRole() {
	        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
	        return authentication.getAuthorities()
	                .iterator()
	                .next()
	                .getAuthority()
	                .replace("ROLE_", "");
	    }
	    
	    public static String getAuthorizationHeader() {
	        ServletRequestAttributes  attributes =
	                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

	        if (attributes == null) {
	            throw new RuntimeException("Request context not found");
	        }

	        return attributes.getRequest().getHeader("Authorization");
	    }
}
