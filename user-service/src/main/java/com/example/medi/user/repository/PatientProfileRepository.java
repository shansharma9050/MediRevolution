package com.example.medi.user.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.user.entity.PatientProfile;

import java.util.Optional;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {

    Optional<PatientProfile> findByAuthUserId(Long authUserId);

    boolean existsByAuthUserId(Long authUserId);
}