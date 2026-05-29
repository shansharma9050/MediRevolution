package com.example.medi.auth.service;
import org.springframework.stereotype.Service;

import com.example.medi.auth.entity.User;
import com.example.medi.auth.repository.UserRepository;

import java.util.List;

@Service
public class AdminUserService {

    private final UserRepository userRepository;

    public AdminUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getPendingUsers() {
        return userRepository.findByApprovedFalseAndActiveTrue();
    }

    public void approveUser(Long userId) {
        User user = getUser(userId);
        user.setApproved(true);
        user.setActive(true);
        userRepository.save(user);
    }

    public void rejectUser(Long userId) {
        User user = getUser(userId);
        user.setApproved(false);
        user.setActive(false);
        userRepository.save(user);
    }

    public void deactivateUser(Long userId) {
        User user = getUser(userId);
        user.setActive(false);
        userRepository.save(user);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
