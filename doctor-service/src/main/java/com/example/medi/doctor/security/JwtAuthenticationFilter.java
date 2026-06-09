package com.example.medi.doctor.security;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
	
	@Autowired
	public JwtUtil jwtUtil;
	
	 @Value("${jwt.secret}")
	    private String secret;

	    @Override
	    protected void doFilterInternal(
	            HttpServletRequest request,
	            HttpServletResponse response,
	            FilterChain filterChain
	    ) throws ServletException, IOException {

	        String authHeader = request.getHeader("Authorization");

	        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
	            filterChain.doFilter(request, response);
	            return;
	        }

	        try {
	            String token = authHeader.substring(7);

	            Claims claims = Jwts.parser()
	                    .verifyWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
	                    .build()
	                    .parseSignedClaims(token)
	                    .getPayload();

	            Long userId = jwtUtil.extractUserId(token);
	            String userName = jwtUtil.extractUserName(token);
	            String email = jwtUtil.extractEmail(token);
	            String role = jwtUtil.extractRole(token);

	            List<SimpleGrantedAuthority> authorities = List.of(
	                    new SimpleGrantedAuthority("ROLE_" + role)
	            );

	            AuthUser authUser = new AuthUser(userId, userName, email, role);

	            UsernamePasswordAuthenticationToken authentication =
	                    new UsernamePasswordAuthenticationToken(authUser, null, authorities);

	            SecurityContextHolder.getContext().setAuthentication(authentication);

	        } catch (Exception e) {
	            response.setContentType("application/json");
	            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
	            response.getWriter().write("""
	                    {
	                      "status": 401,
	                      "message": "Invalid or expired token"
	                    }
	                    """);
	            return;
	        }

	        filterChain.doFilter(request, response);
	    }
}

