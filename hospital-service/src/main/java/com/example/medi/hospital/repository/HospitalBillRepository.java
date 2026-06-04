package com.example.medi.hospital.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.hospital.entity.HospitalBill;

public interface HospitalBillRepository extends JpaRepository<HospitalBill, Long> {

	List<HospitalBill> findByHospitalAuthUserId(Long hospitalAuthUserId);

	long countByHospitalAuthUserId(Long hospitalAuthUserId);
}