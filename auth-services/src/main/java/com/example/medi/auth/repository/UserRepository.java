package com.example.medi.auth.repository;


import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.auth.entity.User;
import com.example.medi.auth.enums.RoleName;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByMobile(String mobile);
    
    List<User> findByApprovedFalseAndActiveTrue();
    
    long countByApprovedFalseAndActiveTrue();

    long countByApprovedTrueAndActiveTrue();

    long countByActiveFalse();
    
    List<User> findByRole(RoleName role);
}
