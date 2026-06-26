package com.example.medi.billing.repository;

import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {

	Optional<UserSubscription> findTopByAuthUserIdAndStatusAndEndDateGreaterThanEqualOrderByEndDateDesc(
            Long authUserId,
            SubscriptionStatus status,
            LocalDate today
    );

    Optional<UserSubscription> findTopByAuthUserIdOrderByCreatedAtDesc(Long authUserId);
}