package com.example.medi.doctor.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.doctor.entity.DoctorAvailability;

import java.time.LocalDate;
import java.util.List;

public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, Long> {

    List<DoctorAvailability> findByDoctorAuthUserIdAndAvailableDate(
            Long doctorAuthUserId,
            LocalDate availableDate
    );

    List<DoctorAvailability> findByDoctorAuthUserId(Long doctorAuthUserId);
}