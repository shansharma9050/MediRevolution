package com.example.medi.hospital.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.medi.hospital.security.JwtAuthenticationFilter;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

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

                        // ================================
                        // PUBLIC / PATIENT ACCESS
                        // ================================

                        .requestMatchers("/hospital/hospital-doctors-public-list")
                        .hasAnyRole("PATIENT", "HOSPITAL", "ADMIN", "SUPER_ADMIN")

                        .requestMatchers("/hospital/available-slots")
                        .hasAnyRole("PATIENT", "HOSPITAL", "ADMIN", "SUPER_ADMIN")

                        // Patient books offline hospital appointment
                        .requestMatchers("/hospital/appointments/book")
                        .hasRole("PATIENT")

                        // Patient views own hospital appointments
                        .requestMatchers("/hospital/appointments/patient")
                        .hasRole("PATIENT")

                        // Patient cancels own hospital appointment
                        .requestMatchers("/hospital/appointments/*/cancel")
                        .hasRole("PATIENT")

                        // Patient starts hospital video consultation payment
                        .requestMatchers("/hospital/payments/video-appointment")
                        .hasRole("PATIENT")

                        // Patient verifies hospital payment, if you are using verify API
                        .requestMatchers("/hospital/payments/verify")
                        .hasRole("PATIENT")

                        // Patient payment success/fail APIs
                        .requestMatchers("/hospital/payments/success")
                        .hasRole("PATIENT")

                        .requestMatchers("/hospital/payments/failed")
                        .hasRole("PATIENT")


                        // ================================
                        // HOSPITAL / ADMIN ACCESS
                        // ================================

                        .requestMatchers("/hospital/**")
                        .hasAnyRole("HOSPITAL", "ADMIN", "SUPER_ADMIN")


                        // ================================
                        // DEFAULT
                        // ================================

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}