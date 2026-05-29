package com.example.medi.user.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.user.entity.WholesalerProfile;

import java.util.Optional;

public interface WholesalerProfileRepository extends JpaRepository<WholesalerProfile, Long> {

    Optional<WholesalerProfile> findByAuthUserId(Long authUserId);
}
