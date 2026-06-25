package com.example.medi.hospital.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.hospital.entity.HospitalAppointment;
import com.example.medi.hospital.enums.HospitalAppointmentStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface HospitalAppointmentRepository extends JpaRepository<HospitalAppointment, Long> {

    List<HospitalAppointment> findByHospitalAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(Long hospitalAuthUserId);

    List<HospitalAppointment> findByPatientAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(Long patientAuthUserId);

    boolean existsByHospitalAuthUserIdAndHospitalDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
            Long hospitalAuthUserId,
            Long hospitalDoctorId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            HospitalAppointmentStatus status
    );

    Optional<HospitalAppointment> findByIdAndPatientAuthUserId(Long id, Long patientAuthUserId);

    Optional<HospitalAppointment> findByPaymentOrderId(String paymentOrderId);
}