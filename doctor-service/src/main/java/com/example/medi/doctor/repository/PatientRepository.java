package com.example.medi.doctor.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.doctor.entity.Patient;

import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    List<Patient> findByDoctorAuthUserId(Long doctorAuthUserId);
    
    List<Patient> findByActiveTrueOrderByIdDesc();
    
    List<Patient> findByDoctorAuthUserIdAndActiveTrue(Long doctorAuthUserId);
}
