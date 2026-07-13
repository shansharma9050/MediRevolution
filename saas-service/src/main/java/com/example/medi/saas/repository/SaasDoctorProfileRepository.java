package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasDoctorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasDoctorProfileRepository extends JpaRepository<SaasDoctorProfile, Long> {

    List<SaasDoctorProfile> findByTenantIdAndActiveTrueOrderByDoctorNameAsc(Long tenantId);

    List<SaasDoctorProfile> findByTenantIdAndDepartmentAndActiveTrueOrderByDoctorNameAsc(
            Long tenantId,
            String department
    );

    Optional<SaasDoctorProfile> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    Optional<SaasDoctorProfile> findByTenantIdAndStaffIdAndActiveTrue(Long tenantId, Long staffId);
    
    long countByTenantIdAndActiveTrue(Long tenantId);
}