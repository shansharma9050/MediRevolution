package com.example.medi.auth.repository;


import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.auth.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByMobile(String mobile);
}
