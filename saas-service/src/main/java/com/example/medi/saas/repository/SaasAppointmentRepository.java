package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.enums.SaasAppointmentStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface SaasAppointmentRepository
        extends JpaRepository<SaasAppointment, Long> {

    /* =========================================================
       BASIC LIST METHODS
    ========================================================= */

    List<SaasAppointment>
    findByTenantIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
            Long tenantId
    );

    Optional<SaasAppointment>
    findByIdAndTenantIdAndActiveTrue(
            Long appointmentId,
            Long tenantId
    );

    List<SaasAppointment>
    findByTenantIdAndPatientIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
            Long tenantId,
            Long patientId
    );

    List<SaasAppointment>
    findByTenantIdAndDoctorAuthUserIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
            Long tenantId,
            Long doctorAuthUserId
    );

    /* =========================================================
       REPORT DATE RANGE
    ========================================================= */

    List<SaasAppointment>
    findByTenantIdAndAppointmentDateBetweenAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
            Long tenantId,
            LocalDate fromDate,
            LocalDate toDate
    );

    /* =========================================================
       DASHBOARD COUNTS
    ========================================================= */

    long countByTenantIdAndActiveTrue(
            Long tenantId
    );

    long countByTenantIdAndStatusAndActiveTrue(
            Long tenantId,
            SaasAppointmentStatus status
    );

    /* =========================================================
       BOOKED SLOT METHODS
    ========================================================= */

    List<SaasAppointment>
    findByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndStatusIn(
            Long tenantId,
            Long doctorAuthUserId,
            LocalDate appointmentDate,
            List<SaasAppointmentStatus> statuses
    );

    boolean existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
            Long tenantId,
            Long doctorAuthUserId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            List<SaasAppointmentStatus> statuses
    );

    boolean existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusInAndIdNot(
            Long tenantId,
            Long doctorAuthUserId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            List<SaasAppointmentStatus> statuses,
            Long appointmentId
    );
}