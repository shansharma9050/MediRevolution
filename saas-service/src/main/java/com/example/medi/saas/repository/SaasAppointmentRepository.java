package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.enums.SaasAppointmentStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface SaasAppointmentRepository
        extends JpaRepository<SaasAppointment, Long> {

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

    Optional<SaasAppointment>
            findFirstByTenantIdAndPatientIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
                    Long tenantId,
                    Long patientId
            );

    long countByTenantIdAndPatientIdAndActiveTrue(
            Long tenantId,
            Long patientId
    );

    List<SaasAppointment>
            findByTenantIdAndDoctorAuthUserIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
                    Long tenantId,
                    Long doctorAuthUserId
            );

    Optional<SaasAppointment>
            findByPaymentOrderId(
                    String paymentOrderId
            );

    List<SaasAppointment>
            findByTenantIdAndAppointmentDateBetweenAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
                    Long tenantId,
                    LocalDate fromDate,
                    LocalDate toDate
            );

    long countByTenantIdAndActiveTrue(
            Long tenantId
    );

    long countByTenantIdAndStatusAndActiveTrue(
            Long tenantId,
            SaasAppointmentStatus status
    );


    /*
     * ================================================================
     * ACTIVE SLOT OCCUPANCY
     * ================================================================
     *
     * IMPORTANT:
     *
     * Soft-deleted patient appointments have active=false.
     * They must never continue blocking a doctor's slot.
     */

    @Query("""
            select a
            from SaasAppointment a
            where a.tenantId = :tenantId
              and a.doctorAuthUserId = :doctorAuthUserId
              and a.appointmentDate = :appointmentDate
              and a.status in :statuses
              and a.active = true
            """)
    List<SaasAppointment>
            findByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndStatusIn(
                    @Param("tenantId")
                    Long tenantId,

                    @Param("doctorAuthUserId")
                    Long doctorAuthUserId,

                    @Param("appointmentDate")
                    LocalDate appointmentDate,

                    @Param("statuses")
                    List<SaasAppointmentStatus> statuses
            );


    @Query("""
            select case when count(a) > 0 then true else false end
            from SaasAppointment a
            where a.tenantId = :tenantId
              and a.doctorAuthUserId = :doctorAuthUserId
              and a.appointmentDate = :appointmentDate
              and a.appointmentTime = :appointmentTime
              and a.status in :statuses
              and a.active = true
            """)
    boolean
            existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
                    @Param("tenantId")
                    Long tenantId,

                    @Param("doctorAuthUserId")
                    Long doctorAuthUserId,

                    @Param("appointmentDate")
                    LocalDate appointmentDate,

                    @Param("appointmentTime")
                    LocalTime appointmentTime,

                    @Param("statuses")
                    List<SaasAppointmentStatus> statuses
            );


    @Query("""
            select case when count(a) > 0 then true else false end
            from SaasAppointment a
            where a.tenantId = :tenantId
              and a.doctorAuthUserId = :doctorAuthUserId
              and a.appointmentDate = :appointmentDate
              and a.appointmentTime = :appointmentTime
              and a.status in :statuses
              and a.id <> :appointmentId
              and a.active = true
            """)
    boolean
            existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusInAndIdNot(
                    @Param("tenantId")
                    Long tenantId,

                    @Param("doctorAuthUserId")
                    Long doctorAuthUserId,

                    @Param("appointmentDate")
                    LocalDate appointmentDate,

                    @Param("appointmentTime")
                    LocalTime appointmentTime,

                    @Param("statuses")
                    List<SaasAppointmentStatus> statuses,

                    @Param("appointmentId")
                    Long appointmentId
            );


    void deleteByTenantId(
            Long tenantId
    );
}