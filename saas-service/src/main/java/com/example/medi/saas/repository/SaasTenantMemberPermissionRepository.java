package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasTenantMemberPermission;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SaasTenantMemberPermissionRepository extends JpaRepository<SaasTenantMemberPermission, Long> {

    List<SaasTenantMemberPermission> findByTenantIdAndAuthUserIdOrderByModuleAscPermissionActionAsc(
            Long tenantId,
            Long authUserId
    );

    Optional<SaasTenantMemberPermission> findByTenantIdAndAuthUserIdAndModuleAndPermissionAction(
            Long tenantId,
            Long authUserId,
            TenantModule module,
            SaasPermissionAction permissionAction
    );

    boolean existsByTenantIdAndAuthUserIdAndModuleAndPermissionActionAndAllowedTrue(
            Long tenantId,
            Long authUserId,
            TenantModule module,
            SaasPermissionAction permissionAction
    );

    @Modifying
    @Query("""
            delete from SaasTenantMemberPermission p
            where p.tenantId = :tenantId
              and p.authUserId = :authUserId
            """)
    void deleteByTenantIdAndAuthUserId(
            Long tenantId,
            Long authUserId
    );
}