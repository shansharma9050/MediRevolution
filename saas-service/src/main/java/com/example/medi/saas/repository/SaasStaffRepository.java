package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.enums.SaasStaffRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasStaffRepository extends JpaRepository<SaasStaff, Long> {

    List<SaasStaff> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

    List<SaasStaff> findByTenantIdAndStaffRoleAndActiveTrueOrderByStaffNameAsc(
            Long tenantId,
            SaasStaffRole staffRole
    );

    Optional<SaasStaff> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    Optional<SaasStaff> findByTenantIdAndAuthUserIdAndActiveTrue(Long tenantId, Long authUserId);

    List<SaasStaff> findByTenantIdAndActiveTrueAndStaffNameContainingIgnoreCaseOrderByCreatedAtDesc(
            Long tenantId,
            String staffName
    );

    List<SaasStaff> findByTenantIdAndActiveTrueAndMobileContainingOrderByCreatedAtDesc(
            Long tenantId,
            String mobile
    );
    
    long countByTenantIdAndActiveTrue(Long tenantId);
    
}