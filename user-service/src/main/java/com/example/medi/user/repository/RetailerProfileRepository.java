package com.example.medi.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.user.entity.RetailerProfile;

import java.util.Optional;

public interface RetailerProfileRepository extends JpaRepository<RetailerProfile, Long> {

    Optional<RetailerProfile> findByAuthUserId(Long authUserId);
}
