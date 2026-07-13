package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasNotification;
import com.example.medi.saas.enums.SaasNotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasNotificationRepository extends JpaRepository<SaasNotification, Long> {

    List<SaasNotification> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

    List<SaasNotification> findByTenantIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

    Optional<SaasNotification> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

    long countByTenantIdAndReadStatusFalseAndActiveTrue(Long tenantId);

    List<SaasNotification> findByTenantIdAndNotificationTypeAndActiveTrueOrderByCreatedAtDesc(
            Long tenantId,
            SaasNotificationType notificationType
    );
    
    boolean existsByTenantIdAndNotificationTypeAndReferenceIdAndReferenceTypeAndReadStatusFalseAndActiveTrue(
            Long tenantId,
            SaasNotificationType notificationType,
            Long referenceId,
            String referenceType
    );
}