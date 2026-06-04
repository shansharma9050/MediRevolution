package com.example.medi.hospital.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.hospital.entity.HospitalPatient;

public interface HospitalPatientRepository extends JpaRepository<HospitalPatient, Long> {

	List<HospitalPatient> findByHospitalAuthUserId(Long hospitalAuthUserId);

	long countByHospitalAuthUserId(Long hospitalAuthUserId);
}
