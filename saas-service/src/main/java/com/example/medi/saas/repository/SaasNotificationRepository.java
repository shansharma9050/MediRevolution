package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasNotification;
import com.example.medi.saas.enums.SaasNotificationType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasNotificationRepository extends JpaRepository<SaasNotification, Long> {

	/*
	 * ========================================================= NORMAL SAAS USER
	 * =========================================================
	 */

	List<SaasNotification> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

	List<SaasNotification> findByTenantIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

	List<SaasNotification> findByTenantIdAndNotificationTypeAndActiveTrueOrderByCreatedAtDesc(Long tenantId,
			SaasNotificationType notificationType);

	long countByTenantIdAndReadStatusFalseAndActiveTrue(Long tenantId);

	Optional<SaasNotification> findByIdAndTenantIdAndActiveTrue(Long notificationId, Long tenantId);

	/*
	 * ========================================================= PATIENT-SPECIFIC
	 * NOTIFICATIONS =========================================================
	 *
	 * Patient ko sirf uski own notifications dikhengi.
	 */

	List<SaasNotification> findByTenantIdAndAuthUserIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId, Long authUserId);

	List<SaasNotification> findByTenantIdAndAuthUserIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(Long tenantId,
			Long authUserId);

	List<SaasNotification> findByTenantIdAndAuthUserIdAndNotificationTypeAndActiveTrueOrderByCreatedAtDesc(
			Long tenantId, Long authUserId, SaasNotificationType notificationType);

	long countByTenantIdAndAuthUserIdAndReadStatusFalseAndActiveTrue(Long tenantId, Long authUserId);

	Optional<SaasNotification> findByIdAndTenantIdAndAuthUserIdAndActiveTrue(Long notificationId, Long tenantId,
			Long authUserId);

	/*
	 * ========================================================= DUPLICATE
	 * PREVENTION =========================================================
	 */

	boolean existsByTenantIdAndNotificationTypeAndReferenceIdAndReferenceTypeAndReadStatusFalseAndActiveTrue(
			Long tenantId, SaasNotificationType notificationType, Long referenceId, String referenceType);
	
	void deleteByTenantId(Long tenantId);
}