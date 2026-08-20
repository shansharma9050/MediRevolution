package com.example.medi.billing.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.enums.SubscriptionStatus;

import jakarta.persistence.LockModeType;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {

	// ============================================================
	// CURRENT SUBSCRIPTION
	// ============================================================

	@Query("""
			    SELECT s
			    FROM UserSubscription s
			    WHERE s.authUserId = :authUserId

			      AND (
			            (:tenantId IS NULL
			                AND s.tenantId IS NULL)

			            OR

			            (:tenantId IS NOT NULL
			                AND s.tenantId = :tenantId)
			          )

			      AND s.status = :status

			      AND s.startDate <= :today
			      AND s.endDate >= :today

			    ORDER BY s.endDate DESC
			""")
	Optional<UserSubscription> findCurrentActiveSubscription(@Param("authUserId") Long authUserId,

			@Param("tenantId") Long tenantId,

			@Param("status") SubscriptionStatus status,

			@Param("today") LocalDate today);

	// ============================================================
	// CURRENT SUBSCRIPTION FOR UPDATE
	// ============================================================

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
			    SELECT s
			    FROM UserSubscription s
			    WHERE s.authUserId = :authUserId

			      AND (
			            (:tenantId IS NULL
			                AND s.tenantId IS NULL)

			            OR

			            (:tenantId IS NOT NULL
			                AND s.tenantId = :tenantId)
			          )

			      AND s.status = :status

			      AND s.startDate <= :today
			      AND s.endDate >= :today

			    ORDER BY s.endDate DESC
			""")
	Optional<UserSubscription> findCurrentActiveSubscriptionForUpdate(@Param("authUserId") Long authUserId,

			@Param("tenantId") Long tenantId,

			@Param("status") SubscriptionStatus status,

			@Param("today") LocalDate today);

	// ============================================================
	// LATEST ACTIVE / FUTURE SUBSCRIPTION FOR UPDATE
	// ============================================================

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
			    SELECT s
			    FROM UserSubscription s
			    WHERE s.authUserId = :authUserId

			      AND (
			            (:tenantId IS NULL
			                AND s.tenantId IS NULL)

			            OR

			            (:tenantId IS NOT NULL
			                AND s.tenantId = :tenantId)
			          )

			      AND s.status = :status

			      AND s.endDate >= :today

			    ORDER BY s.endDate DESC
			""")
	Optional<UserSubscription> findLatestActiveOrScheduledForUpdate(@Param("authUserId") Long authUserId,

			@Param("tenantId") Long tenantId,

			@Param("status") SubscriptionStatus status,

			@Param("today") LocalDate today);

	// ============================================================
	// SUBSCRIPTION HISTORY
	// ============================================================

	@Query("""
			    SELECT s
			    FROM UserSubscription s
			    WHERE s.authUserId = :authUserId

			      AND (
			            (:tenantId IS NULL
			                AND s.tenantId IS NULL)

			            OR

			            (:tenantId IS NOT NULL
			                AND s.tenantId = :tenantId)
			          )

			    ORDER BY s.createdAt DESC
			""")
	List<UserSubscription> findSubscriptionHistory(@Param("authUserId") Long authUserId,

			@Param("tenantId") Long tenantId);

	default Optional<UserSubscription> findLatestSubscription(Long authUserId, Long tenantId) {

		return findSubscriptionHistory(authUserId, tenantId).stream().findFirst();
	}

	// ============================================================
	// ACTIVE SUBSCRIPTIONS
	// ============================================================

	@Query("""
			    SELECT s
			    FROM UserSubscription s
			    WHERE s.authUserId = :authUserId

			      AND (
			            (:tenantId IS NULL
			                AND s.tenantId IS NULL)

			            OR

			            (:tenantId IS NOT NULL
			                AND s.tenantId = :tenantId)
			          )

			      AND s.status = :status

			    ORDER BY s.endDate DESC
			""")
	List<UserSubscription> findByAuthUserAndTenantAndStatus(@Param("authUserId") Long authUserId,

			@Param("tenantId") Long tenantId,

			@Param("status") SubscriptionStatus status);

	// ============================================================
	// EXPIRED SUBSCRIPTIONS
	// ============================================================

	List<UserSubscription> findByStatusAndEndDateBefore(SubscriptionStatus status, LocalDate date);

	// ============================================================
	// LATEST BY END DATE
	// ============================================================

	@Query("""
			    SELECT s
			    FROM UserSubscription s
			    WHERE s.authUserId = :authUserId

			      AND (
			            (:tenantId IS NULL
			                AND s.tenantId IS NULL)

			            OR

			            (:tenantId IS NOT NULL
			                AND s.tenantId = :tenantId)
			          )

			    ORDER BY s.endDate DESC
			""")
	List<UserSubscription> findByAuthUserAndTenantOrderByEndDateDesc(@Param("authUserId") Long authUserId,

			@Param("tenantId") Long tenantId);

	// ============================================================
	// BULK EXPIRY
	// ============================================================

	@Query("""
			    SELECT s
			    FROM UserSubscription s
			    WHERE s.status = :status
			      AND s.endDate < :today
			""")
	List<UserSubscription> findExpiredActiveSubscriptions(@Param("status") SubscriptionStatus status,

			@Param("today") LocalDate today);
	
	void deleteByTenantId(Long tenantId);
}