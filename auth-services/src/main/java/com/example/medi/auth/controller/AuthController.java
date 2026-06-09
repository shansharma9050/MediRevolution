package com.example.medi.auth.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.medi.auth.dto.AuthResponse;
import com.example.medi.auth.dto.LoginRequest;
import com.example.medi.auth.dto.OtpRequest;
import com.example.medi.auth.dto.RegisterRequest;
import com.example.medi.auth.dto.RegisteredPatientResponse;
import com.example.medi.auth.enums.RoleName;
import com.example.medi.auth.repository.UserRepository;
import com.example.medi.auth.service.AuthService;
import com.example.medi.auth.service.OtpService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthService authService;

	private final OtpService otpService;

	private final UserRepository userRepository;

	public AuthController(AuthService authService, OtpService otpService, UserRepository userRepository) {
		this.authService = authService;
		this.otpService = otpService;
		this.userRepository = userRepository;
	}

	@PostMapping("/register")
	public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
		return authService.register(request);
	}

	@PostMapping("/login")
	public AuthResponse login(@Valid @RequestBody LoginRequest request) {

		System.out.println(new BCryptPasswordEncoder().encode("admin"));
		return authService.login(request);
	}

	@PostMapping("/send-email-otp")
	public ResponseEntity<?> sendEmailOtp(@RequestBody OtpRequest request) {

		try {
			otpService.sendEmailOtp(request.getEmail());

			return ResponseEntity.ok(Map.of("message", "Email OTP sent successfully"));

		} catch (Exception e) {
			return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
		}
	}

	@PostMapping("/verify-email-otp")
	public ResponseEntity<?> verifyEmailOtp(@RequestBody OtpRequest request) {

		try {
			otpService.verifyEmailOtp(request.getEmail(), request.getOtp());

			return ResponseEntity.ok(Map.of("message", "Email verified successfully"));

		} catch (Exception e) {
			return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
		}
	}

	@GetMapping("/registered-patients")
	public ResponseEntity<?> getRegisteredPatients() {

		List<RegisteredPatientResponse> patients = userRepository.findByRole(RoleName.PATIENT).stream()
				.map(user -> new RegisteredPatientResponse(user.getId(), user.getFullName(), user.getEmail(),
						user.getMobile(), user.getRole()))
				.toList();

		return ResponseEntity.ok(patients);
	}
}
