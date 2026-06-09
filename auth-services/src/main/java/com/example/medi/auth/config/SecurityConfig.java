package com.example.medi.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.medi.auth.security.JwtAuthenticationFilter;

@Configuration
public class SecurityConfig {
	
	private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

    	 http
         .csrf(csrf -> csrf.disable())
         .sessionManagement(session ->
                 session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
         )
         .authorizeHttpRequests(auth -> auth
        	        .requestMatchers(HttpMethod.POST, "/",
        	                "/register",
        	                "/forgot-password",
        	                "/auth/register",
        	                "/auth/login",
        	                "/auth/send-email-otp",
        	                "/auth/verify-email-otp",
        	                "/auth/forgot-password/**",
        	                "/css/**",
        	                "/js/**",
        	                "/images/**",
        	                "/manifest.json").permitAll()
        	        .requestMatchers("/actuator/**").permitAll()
        	        .requestMatchers("/auth/registered-patients").hasRole("DOCTOR")
        	        .requestMatchers("/auth/admin/users/**").hasAuthority("ROLE_SUPER_ADMIN")
        	        .anyRequest().authenticated()
        	)
         .addFilterBefore(
                 jwtAuthenticationFilter,
                 UsernamePasswordAuthenticationFilter.class
         );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
