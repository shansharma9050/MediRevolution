package com.example.medi.hospital.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.hospital.entity.HospitalDoctorAvailability;

import java.time.LocalDate;
import java.util.List;

public interface HospitalDoctorAvailabilityRepository extends JpaRepository<HospitalDoctorAvailability, Long> {

	 List<HospitalDoctorAvailability> findByHospitalAuthUserId(Long hospitalAuthUserId);

	    List<HospitalDoctorAvailability> findByHospitalAuthUserIdAndHospitalDoctorIdAndAvailableDate(
	            Long hospitalAuthUserId,
	            Long hospitalDoctorId,
	            LocalDate availableDate
	    );
}
