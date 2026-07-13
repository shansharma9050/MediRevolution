package com.example.medi.saas.repository;

import com.example.medi.saas.entity.TenantMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantMemberRepository extends JpaRepository<TenantMember, Long> {

    List<TenantMember> findByAuthUserIdAndActiveTrue(Long authUserId);

    List<TenantMember> findByTenantIdAndActiveTrue(Long tenantId);

    Optional<TenantMember> findByTenantIdAndAuthUserIdAndActiveTrue(Long tenantId, Long authUserId);

    boolean existsByTenantIdAndAuthUserId(Long tenantId, Long authUserId);
}