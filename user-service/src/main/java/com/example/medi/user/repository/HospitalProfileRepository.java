package com.example.medi.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.user.entity.HospitalProfile;

import java.util.List;
import java.util.Optional;

public interface HospitalProfileRepository extends JpaRepository<HospitalProfile, Long> {

    Optional<HospitalProfile> findByAuthUserId(Long authUserId);

    boolean existsByAuthUserId(Long authUserId);

    List<HospitalProfile> findAllByOrderByHospitalNameAsc();
}