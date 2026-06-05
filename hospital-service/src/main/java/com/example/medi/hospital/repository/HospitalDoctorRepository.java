package com.example.medi.hospital.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.hospital.entity.HospitalDoctor;

import java.util.List;

public interface HospitalDoctorRepository extends JpaRepository<HospitalDoctor, Long> {

    List<HospitalDoctor> findByHospitalAuthUserIdAndActiveTrue(Long hospitalAuthUserId);

    List<HospitalDoctor> findByHospitalAuthUserId(Long hospitalAuthUserId);

    List<HospitalDoctor> findByActiveTrue();
}