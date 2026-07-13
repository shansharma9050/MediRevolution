package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasDoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasDoctorScheduleRepository extends JpaRepository<SaasDoctorSchedule, Long> {

    List<SaasDoctorSchedule> findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(
            Long tenantId,
            Long doctorProfileId
    );
    
    List<SaasDoctorSchedule> findByTenantIdAndDoctorProfileIdAndDayOfWeekAndActiveTrueAndStatusOrderByStartTimeAsc(
            Long tenantId,
            Long doctorProfileId,
            java.time.DayOfWeek dayOfWeek,
            com.example.medi.saas.enums.DoctorAvailabilityStatus status
    );
}