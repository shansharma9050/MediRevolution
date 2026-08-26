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

				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

				.authorizeHttpRequests(auth -> auth

						/*
						 * ====================================================== OPTIONS / CORS
						 * ======================================================
						 */
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

						/*
						 * ====================================================== INTERNAL SERVICE APIs
						 * ======================================================
						 */
						.requestMatchers("/saas/internal/**").permitAll()

						.requestMatchers(HttpMethod.GET, "/saas/patients/me")
						.hasAnyRole("HOSPITAL", "DOCTOR", "PATIENT")

						/*
						 * ====================================================== WORKSPACE CREATION
						 * ======================================================
						 */
						.requestMatchers(HttpMethod.POST, "/saas/tenants")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER")

						/*
						 * ====================================================== WORKSPACE DELETION
						 * ======================================================
						 */
						.requestMatchers(HttpMethod.DELETE, "/saas/tenants/*")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER")

						/*
						 * ====================================================== WORKSPACE LIST
						 * ======================================================
						 */
						.requestMatchers(HttpMethod.GET, "/saas/tenants")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "PATIENT",
								"SAAS_CUSTOMER")

						/*
						 * ====================================================== WORKSPACE ACCESS
						 * ======================================================
						 */
						.requestMatchers("/saas/tenants/*/access").permitAll()

						/*
						 * ====================================================== WORKSPACE MODULE
						 * CONFIGURATION
						 *
						 * SAAS_CUSTOMER can load assigned wholesaler module configuration.
						 * ======================================================
						 */
						.requestMatchers(HttpMethod.GET, "/saas/tenants/*/modules")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "SAAS_CUSTOMER",
								"PATIENT")

						/*
						 * ====================================================== CURRENT USER
						 * PERMISSIONS ======================================================
						 */
						.requestMatchers(HttpMethod.GET, "/saas/permissions/current")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "SAAS_CUSTOMER")

						/*
						 * ====================================================== PERMISSION
						 * ADMINISTRATION
						 *
						 * SAAS_CUSTOMER MUST NOT access these APIs.
						 * ======================================================
						 */
						.requestMatchers("/saas/permissions/members", "/saas/permissions/member",
								"/saas/permissions/check")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF")

						.requestMatchers(HttpMethod.PUT, "/saas/permissions/member")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF")

						/*
						 * ====================================================== CUSTOMER NOTIFICATIONS
						 * ======================================================
						 */
						.requestMatchers("/saas/notifications/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "SAAS_CUSTOMER","PATIENT")

						/*
						 * ====================================================== CUSTOMER SALES ORDER
						 * APIs
						 *
						 * IMPORTANT:
						 *
						 * JwtAuthFilter creates:
						 *
						 * ROLE_SAAS_CUSTOMER
						 *
						 * Therefore use hasAuthority().
						 * ======================================================
						 */

						.requestMatchers(HttpMethod.GET, "/saas/sales-orders/customer/catalog")
						.hasAuthority("ROLE_SAAS_CUSTOMER")

						.requestMatchers(HttpMethod.GET, "/saas/sales-orders/customer/orders")
						.hasAuthority("ROLE_SAAS_CUSTOMER")

						.requestMatchers(HttpMethod.GET, "/saas/sales-orders/customer/orders/**")
						.hasAuthority("ROLE_SAAS_CUSTOMER")

						.requestMatchers(HttpMethod.GET, "/saas/sales-orders/customer/summary")
						.hasAuthority("ROLE_SAAS_CUSTOMER")

						.requestMatchers(HttpMethod.GET, "/saas/sales-orders/customer/search")
						.hasAuthority("ROLE_SAAS_CUSTOMER")

						.requestMatchers(HttpMethod.POST, "/saas/sales-orders/customer")
						.hasAuthority("ROLE_SAAS_CUSTOMER")

						/*
						 * ====================================================== GENERAL SALES ORDER
						 * APIs
						 *
						 * Customer API above is matched first.
						 * ======================================================
						 */
						.requestMatchers("/saas/sales-orders/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "SAAS_CUSTOMER")

						/*
						 * ====================================================== CUSTOMER READ ACCESS
						 * TO MEDICINE MASTER ======================================================
						 */
						.requestMatchers(HttpMethod.GET, "/saas/medicine-master/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "SAAS_CUSTOMER")

						/*
						 * ====================================================== CUSTOMER READ ACCESS
						 * TO INVENTORY ======================================================
						 */
						.requestMatchers(HttpMethod.GET, "/saas/inventory/stocks/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "SAAS_CUSTOMER")

						/*
						 * ====================================================== APPOINTMENTS
						 * ======================================================
						 */
						.requestMatchers(HttpMethod.GET, "/saas/staff/doctors/for-appointments")
						.hasAnyRole("HOSPITAL", "DOCTOR", "SAAS_STAFF", "PATIENT")

						.requestMatchers(HttpMethod.POST, "/saas/appointments")
						.hasAnyRole("HOSPITAL", "DOCTOR", "SAAS_STAFF")

						.requestMatchers("/saas/appointments/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "SAAS_STAFF", "PATIENT")

						.requestMatchers("/saas/doctor-availability/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "SAAS_STAFF", "PATIENT")

						.requestMatchers(HttpMethod.GET, "/saas/staff/doctors/for-clinical")
						.hasAnyRole("HOSPITAL", "DOCTOR", "SAAS_STAFF")

						.requestMatchers("/saas/appointments/online-payment").hasRole("PATIENT")
						/*
						 * ====================================================== STAFF
						 * ======================================================
						 */
						.requestMatchers("/saas/staff", "/saas/staff/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF")

						/*
						 * ====================================================== GENERAL TENANT API
						 * ======================================================
						 */
						.requestMatchers("/saas/tenants", "/saas/tenants/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF", "PATIENT",
								"SAAS_CUSTOMER")

						/*
						 * ====================================================== GENERAL SAAS FALLBACK
						 *
						 * SAAS_CUSTOMER intentionally NOT included.
						 *
						 * Customer can access only explicitly allowed APIs.
						 * ======================================================
						 */
						.requestMatchers("/saas/**")
						.hasAnyRole("HOSPITAL", "DOCTOR", "WHOLESALER", "RETAILER", "SAAS_STAFF")

						/*
						 * ====================================================== EVERYTHING ELSE
						 * ======================================================
						 */
						.anyRequest().authenticated())

				.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}

	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {

		return configuration.getAuthenticationManager();
	}
}