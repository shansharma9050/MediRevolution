package com.example.medi.billing.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.medi.billing.entity.SubscriptionPayment;
import com.example.medi.billing.enums.SubscriptionPaymentStatus;

import jakarta.persistence.LockModeType;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

	/*
	 * ============================================================ PAYMENT LOCK
	 * ============================================================
	 */

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
			SELECT p
			FROM SubscriptionPayment p
			WHERE p.merchantOrderId = :merchantOrderId
			""")
	Optional<SubscriptionPayment> findByMerchantOrderIdForUpdate(@Param("merchantOrderId") String merchantOrderId);

	/*
	 * ============================================================ NORMAL LOOKUP
	 * ============================================================
	 */

	Optional<SubscriptionPayment> findByMerchantOrderId(String merchantOrderId);

	/*
	 * ============================================================ USER PAYMENT
	 * HISTORY ============================================================
	 */

	List<SubscriptionPayment> findByAuthUserIdOrderByIdDesc(Long authUserId);

	/*
	 * ============================================================ USER + TENANT
	 * PAYMENT HISTORY ============================================================
	 */

	@Query("""
			SELECT p
			FROM SubscriptionPayment p
			WHERE p.authUserId = :authUserId

			  AND (
			        (:tenantId IS NULL AND p.tenantId IS NULL)
			        OR
			        (:tenantId IS NOT NULL AND p.tenantId = :tenantId)
			      )

			ORDER BY p.id DESC
			""")
	List<SubscriptionPayment> findByAuthUserAndTenantOrderByIdDesc(@Param("authUserId") Long authUserId,
			@Param("tenantId") Long tenantId);

	/*
	 * ============================================================ USER + STATUS
	 * ============================================================
	 */

	List<SubscriptionPayment> findByAuthUserIdAndPaymentStatusOrderByIdDesc(Long authUserId,
			SubscriptionPaymentStatus paymentStatus);

	/*
	 * ============================================================ SUBSCRIPTION
	 * PAYMENT HISTORY ============================================================
	 */

	List<SubscriptionPayment> findBySubscriptionIdOrderByIdDesc(Long subscriptionId);

	/*
	 * ============================================================ OWNERSHIP
	 * ============================================================
	 */

	Optional<SubscriptionPayment> findByIdAndAuthUserId(Long id, Long authUserId);
	
	void deleteByTenantId(Long tenantId);
}