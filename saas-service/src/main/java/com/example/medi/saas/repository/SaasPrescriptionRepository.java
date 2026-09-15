package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPrescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SaasPrescriptionRepository
        extends JpaRepository<SaasPrescription, Long> {

    List<SaasPrescription>
            findByTenantIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId
            );

    Optional<SaasPrescription>
            findByIdAndTenantIdAndActiveTrue(
                    Long id,
                    Long tenantId
            );

    List<SaasPrescription>
            findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId,
                    Long patientId
            );

    Optional<SaasPrescription>
            findFirstByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId,
                    Long patientId
            );

    long countByTenantIdAndPatientIdAndActiveTrue(
            Long tenantId,
            Long patientId
    );

    Optional<SaasPrescription>
            findFirstByTenantIdAndPatientIdAndActiveTrueAndFollowUpDateGreaterThanEqualOrderByFollowUpDateAsc(
                    Long tenantId,
                    Long patientId,
                    LocalDate followUpDate
            );

    List<SaasPrescription>
            findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId,
                    Long doctorProfileId
            );

    List<SaasPrescription>
            findByTenantIdAndAppointmentIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId,
                    Long appointmentId
            );

    Optional<SaasPrescription>
            findFirstByTenantIdAndAppointmentIdAndActiveTrueOrderByCreatedAtDesc(
                    Long tenantId,
                    Long appointmentId
            );

    boolean existsByTenantIdAndAppointmentIdAndActiveTrue(
            Long tenantId,
            Long appointmentId
    );

    void deleteByTenantId(
            Long tenantId
    );
}