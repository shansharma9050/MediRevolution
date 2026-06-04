package com.example.medi.hospital.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.hospital.entity.Staff;

public interface StaffRepository extends JpaRepository<Staff, Long> {

	List<Staff> findByHospitalAuthUserId(Long hospitalAuthUserId);

	long countByHospitalAuthUserId(Long hospitalAuthUserId);
}