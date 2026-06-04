package com.example.medi.hospital.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.hospital.entity.HospitalInventory;

public interface HospitalInventoryRepository extends JpaRepository<HospitalInventory, Long> {

	List<HospitalInventory> findByHospitalAuthUserId(Long hospitalAuthUserId);

	long countByHospitalAuthUserId(Long hospitalAuthUserId);
}