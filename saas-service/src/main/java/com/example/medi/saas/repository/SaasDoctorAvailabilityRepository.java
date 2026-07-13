package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasDoctorAvailability;
import com.example.medi.saas.enums.SaasAvailabilityStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface SaasDoctorAvailabilityRepository extends JpaRepository<SaasDoctorAvailability, Long> {

    List<SaasDoctorAvailability> findByTenantIdAndDoctorAuthUserIdAndAvailableDateAndStatusOrderByStartTimeAsc(
            Long tenantId,
            Long doctorAuthUserId,
            LocalDate availableDate,
            SaasAvailabilityStatus status
    );

    List<SaasDoctorAvailability> findByTenantIdAndAvailableDateAndStatusOrderByStartTimeAsc(
            Long tenantId,
            LocalDate availableDate,
            SaasAvailabilityStatus status
    );

    List<SaasDoctorAvailability> findByTenantIdAndDoctorAuthUserIdAndStatusOrderByAvailableDateAscStartTimeAsc(
            Long tenantId,
            Long doctorAuthUserId,
            SaasAvailabilityStatus status
    );

    boolean existsByTenantIdAndDoctorAuthUserIdAndAvailableDateAndStartTimeAndEndTimeAndStatus(
            Long tenantId,
            Long doctorAuthUserId,
            LocalDate availableDate,
            java.time.LocalTime startTime,
            java.time.LocalTime endTime,
            SaasAvailabilityStatus status
    );
}