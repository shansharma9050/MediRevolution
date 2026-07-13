package com.example.medi.auth.controller;

import com.example.medi.auth.dto.AuthUserResponse;
import com.example.medi.auth.dto.CreateSaasStaffRequest;
import com.example.medi.auth.entity.User;
import com.example.medi.auth.enums.RoleName;
import com.example.medi.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/internal")
public class AuthInternalController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthInternalController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/saas-staff")
    public AuthUserResponse createSaasStaff(@RequestBody CreateSaasStaffRequest request) {

        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new RuntimeException("Staff name is required");
        }

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new RuntimeException("Email is required");
        }

        if (request.getMobile() == null || request.getMobile().isBlank()) {
            throw new RuntimeException("Mobile is required");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user != null) {
            if (user.getRole() != RoleName.SAAS_STAFF) {
                throw new RuntimeException("This email is already registered with another role");
            }

            return toResponse(user);
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("Password is required for new staff");
        }

        if (userRepository.existsByMobile(request.getMobile())) {
            throw new RuntimeException("Mobile already registered");
        }

        User newUser = new User();
        newUser.setFullName(request.getFullName().trim());
        newUser.setEmail(request.getEmail().trim().toLowerCase());
        newUser.setMobile(request.getMobile());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setRole(RoleName.SAAS_STAFF);
        newUser.setActive(true);
        newUser.setApproved(true);

        User saved = userRepository.save(newUser);

        return toResponse(saved);
    }

    @GetMapping("/users/by-email")
    public AuthUserResponse getUserByEmail(@RequestParam String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return toResponse(user);
    }

    private AuthUserResponse toResponse(User user) {
        return new AuthUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getMobile(),
                user.getRole().name(),
                user.isActive(),
                user.isApproved()
        );
    }
}