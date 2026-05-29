package com.example.medi.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.user.entity.HospitalProfile;

import java.util.Optional;

public interface HospitalProfileRepository extends JpaRepository<HospitalProfile, Long> {

    Optional<HospitalProfile> findByAuthUserId(Long authUserId);
}
