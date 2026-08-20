package com.example.medi.billing.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.billing.entity.SubscriptionPlan;
import com.example.medi.billing.enums.SubscriptionRole;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {

	/*
	 * All active plans.
	 */
	List<SubscriptionPlan> findByActiveTrue();

	/*
	 * Active plans for a particular role.
	 */
	List<SubscriptionPlan> findByRoleAndActiveTrue(SubscriptionRole role);

	/*
	 * Find a plan by unique plan code.
	 */
	Optional<SubscriptionPlan> findByPlanCodeAndActiveTrue(String planCode);

	/*
	 * Useful when checking plan code without active filter.
	 */
	Optional<SubscriptionPlan> findByPlanCode(String planCode);
}