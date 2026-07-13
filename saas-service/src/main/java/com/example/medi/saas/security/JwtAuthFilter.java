package com.example.medi.saas.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

	private final JwtUtil jwtUtil;

	public JwtAuthFilter(JwtUtil jwtUtil) {
		this.jwtUtil = jwtUtil;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		try {
			String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

			if (authHeader != null && authHeader.startsWith("Bearer ")) {

				String token = authHeader.substring(7);

				Long userId = jwtUtil.extractUserId(token);
				String role = jwtUtil.extractRole(token);
				String email = jwtUtil.extractEmail(token);
				String userName = jwtUtil.extractUserName(token);

				if (userId != null && role != null && email != null) {

					String authorityName = role.startsWith("ROLE_") ? role : "ROLE_" + role;

					SimpleGrantedAuthority authority = new SimpleGrantedAuthority(authorityName);

					UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(email,
							null, List.of(authority));

					authentication.setDetails(userId);

					SecurityContextHolder.getContext().setAuthentication(authentication);

					CurrentUserUtil.set(userId, role, email, userName);
				}
			}

		} catch (Exception jwtException) {

			SecurityContextHolder.clearContext();
			CurrentUserUtil.clear();

			System.err.println("JWT authentication failed: " + jwtException.getMessage());
		}

		try {
			/*
			 * Filter chain exactly one time call hogi.
			 */
			filterChain.doFilter(request, response);

		} finally {
			CurrentUserUtil.clear();
		}
	}
}