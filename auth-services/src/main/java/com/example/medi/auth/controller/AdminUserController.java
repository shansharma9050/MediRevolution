package com.example.medi.auth.controller;

import org.springframework.web.bind.annotation.*;

import com.example.medi.auth.dto.AdminDashboardCountResponse;
import com.example.medi.auth.entity.User;
import com.example.medi.auth.service.AdminUserService;

import java.util.List;

@RestController
@RequestMapping("/auth/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping("/pending")
    public List<User> getPendingUsers() {
        return adminUserService.getPendingUsers();
    }

    @PutMapping("/{userId}/approve")
    public String approveUser(@PathVariable Long userId) {
        adminUserService.approveUser(userId);
        return "User approved successfully";
    }

    @PutMapping("/{userId}/reject")
    public String rejectUser(@PathVariable Long userId) {
        adminUserService.rejectUser(userId);
        return "User rejected successfully";
    }

    @PutMapping("/{userId}/deactivate")
    public String deactivateUser(@PathVariable Long userId) {
        adminUserService.deactivateUser(userId);
        return "User deactivated successfully";
    }
    
    @GetMapping("/dashboard-counts")
    public AdminDashboardCountResponse getDashboardCounts() {
        return adminUserService.getAdminDashboardCounts();
    }
}
