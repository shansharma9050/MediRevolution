package com.example.medi.auth.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.medi.auth.constant.OtpType;
import com.example.medi.auth.dto.AuthResponse;
import com.example.medi.auth.dto.LoginRequest;
import com.example.medi.auth.dto.RegisterRequest;
import com.example.medi.auth.entity.User;
import com.example.medi.auth.enums.RoleName;
import com.example.medi.auth.exception.ApiException;
import com.example.medi.auth.repository.UserRepository;
import com.example.medi.auth.security.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,OtpService otpService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
    }

    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException("Email already registered");
        }

        if (request.getMobile() != null && userRepository.existsByMobile(request.getMobile())) {
            throw new ApiException("Mobile already registered");
        }
        
        if (!otpService.isVerified(request.getEmail().trim().toLowerCase(), OtpType.EMAIL)) {
            throw new ApiException("Email is not verified");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setMobile(request.getMobile());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());

        
        user.setActive(true);

       
        
		/*
		 * if (request.getRole() == RoleName.SUPER_ADMIN) { user.setApproved(true); }
		 */ 
        if (request.getRole() == RoleName.PATIENT) {
            user.setApproved(true);
        }else {
            user.setApproved(false);
        }

        userRepository.save(user);

        return new AuthResponse(
                null,
                user.getEmail(),
                user.getRole().name(),
                "Registration successful. Please wait for admin approval."
        );
    }

    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApiException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ApiException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new ApiException("Account is inactive");
        }

        if (!user.isApproved()) {
            throw new ApiException("Account is pending admin approval");
        }

        String token = jwtService.generateToken(user);

        return new AuthResponse(
                token,
                user.getEmail(),
                user.getRole().name(),
                "Login successful"
        );
    }
}