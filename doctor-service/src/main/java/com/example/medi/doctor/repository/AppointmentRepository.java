package com.example.medi.doctor.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.doctor.entity.Appointment;
import com.example.medi.doctor.enums.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByDoctorAuthUserId(Long doctorAuthUserId);
    long countByDoctorAuthUserIdAndStatus(Long doctorAuthUserId, AppointmentStatus status);
    
    List<Appointment> findByDoctorAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(Long doctorAuthUserId);

    List<Appointment> findByPatientAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(Long patientAuthUserId);

    boolean existsByDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
            Long doctorAuthUserId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            AppointmentStatus status
    );

    
    Optional<Appointment> findByPaymentOrderId(String paymentOrderId);

    Optional<Appointment> findByIdAndPatientAuthUserId(Long id, Long patientAuthUserId);

    Optional<Appointment> findByIdAndDoctorAuthUserId(Long id, Long doctorAuthUserId);
}