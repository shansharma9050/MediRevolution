package com.example.medi.doctor.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.doctor.entity.Prescription;

import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByDoctorAuthUserId(Long doctorAuthUserId);
    
    Optional<Prescription> findByIdAndDoctorAuthUserId(Long id, Long doctorAuthUserId);
    
    
    List<Prescription> findByPatientPatientAuthUserIdOrderByPrescriptionDateDesc(Long patientAuthUserId);
    

    Optional<Prescription> findByIdAndPatientPatientAuthUserId(Long id, Long patientAuthUserId);
}