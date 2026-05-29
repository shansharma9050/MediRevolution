package com.example.medi.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.user.entity.DoctorProfile;

import java.util.Optional;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {

    Optional<DoctorProfile> findByAuthUserId(Long authUserId);
}
