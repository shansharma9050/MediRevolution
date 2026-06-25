package com.example.medi.billing.repository;

import com.example.medi.billing.entity.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {

    List<SubscriptionPlan> findByTargetRoleAndActiveTrueOrderByMonthlyPriceAsc(String targetRole);

    Optional<SubscriptionPlan> findByPlanCodeAndActiveTrue(String planCode);

    boolean existsByPlanCode(String planCode);
}