package com.example.medi.saas.config;

import com.example.medi.saas.security.JwtAuthFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	private final JwtAuthFilter jwtAuthFilter;

	public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
		this.jwtAuthFilter = jwtAuthFilter;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

		http
				.csrf(csrf -> csrf.disable())

				.cors(cors -> {
				})

				.sessionManagement(session ->
						session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
				)

				.authorizeHttpRequests(auth -> auth

						.requestMatchers(HttpMethod.OPTIONS, "/**")
						.permitAll()
						
						.requestMatchers(HttpMethod.POST, "/saas/tenants")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"WHOLESALER",
								"RETAILER"
						)

						.requestMatchers(HttpMethod.GET, "/saas/tenants")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"WHOLESALER",
								"RETAILER",
								"SAAS_STAFF"
						)

						.requestMatchers(HttpMethod.GET, "/saas/staff/doctors/for-appointments")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"SAAS_STAFF"
						)

						.requestMatchers(HttpMethod.POST, "/saas/appointments")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"SAAS_STAFF"
						)

						.requestMatchers("/saas/appointments/**")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"SAAS_STAFF"
						)

						.requestMatchers("/saas/doctor-availability/**")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"SAAS_STAFF"
						)

						.requestMatchers(HttpMethod.GET, "/saas/staff/doctors/for-clinical")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"SAAS_STAFF"
						)

						.requestMatchers(
								"/saas/staff",
								"/saas/staff/**"
						)
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"WHOLESALER",
								"RETAILER",
								"SAAS_STAFF"
						)

						/*
						 * Exact URL aur child URLs dono included hain.
						 */
						.requestMatchers(
								"/saas/tenants",
								"/saas/tenants/**"
						)
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"WHOLESALER",
								"RETAILER",
								"SAAS_STAFF"
						)

						/*
						 * General SaaS fallback.
						 */
						.requestMatchers("/saas/**")
						.hasAnyRole(
								"HOSPITAL",
								"DOCTOR",
								"WHOLESALER",
								"RETAILER",
								"SAAS_STAFF"
						)

						.anyRequest()
						.authenticated()
				)

				.addFilterBefore(
						jwtAuthFilter,
						UsernamePasswordAuthenticationFilter.class
				);

		return http.build();
	}

	@Bean
	public AuthenticationManager authenticationManager(
			AuthenticationConfiguration configuration
	) throws Exception {

		return configuration.getAuthenticationManager();
	}
}