package com.example.medi.doctor.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.doctor.entity.Prescription;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    List<Prescription> findByDoctorAuthUserIdOrderByPrescriptionDateDesc(Long doctorAuthUserId);
}