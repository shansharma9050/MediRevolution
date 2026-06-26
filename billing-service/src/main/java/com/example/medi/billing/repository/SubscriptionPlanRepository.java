package com.example.medi.billing.repository;

import com.example.medi.billing.entity.SubscriptionPlan;
import com.example.medi.billing.enums.SubscriptionRole;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {

	 List<SubscriptionPlan> findByRoleAndActiveTrue(SubscriptionRole role);

	    List<SubscriptionPlan> findByActiveTrue();
	    
	    Optional<SubscriptionPlan> findByPlanCodeAndActiveTrue(String planCode);
    
    
}