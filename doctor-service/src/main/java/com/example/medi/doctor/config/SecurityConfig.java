package com.example.medi.doctor.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.medi.doctor.security.JwtAuthenticationFilter;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

@Configuration
public class SecurityConfig {

	private final JwtAuthenticationFilter jwtAuthenticationFilter;

	public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
		this.jwtAuthenticationFilter = jwtAuthenticationFilter;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

		http.csrf(csrf -> csrf.disable()).cors(cors -> {
		}).authorizeHttpRequests(auth -> auth

				.requestMatchers("/payment-success", "/doctor/payments/verify", "/doctor/payments/callback", "/css/**",
						"/js/**", "/images/**")
				.permitAll().requestMatchers("/doctor/available-slots/**").hasAnyRole("PATIENT", "DOCTOR")

				.requestMatchers("/doctor/appointments/book").hasRole("PATIENT")

				.requestMatchers("/doctor/appointments/patient").hasRole("PATIENT")

				.requestMatchers("/doctor/appointments/*/cancel").hasRole("PATIENT")

				.requestMatchers("/doctor/payments/video-appointment").hasRole("PATIENT")

				.requestMatchers("/doctor/patient/**").hasRole("PATIENT")

				.requestMatchers("/doctor/prescriptions/*/download").hasAnyRole("DOCTOR", "PATIENT")

				.requestMatchers("/doctor/**").hasRole("DOCTOR")

				.anyRequest().authenticated())
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}
}