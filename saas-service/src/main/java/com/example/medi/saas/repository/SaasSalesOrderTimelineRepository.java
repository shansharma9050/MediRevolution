package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSalesOrderTimeline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasSalesOrderTimelineRepository extends JpaRepository<SaasSalesOrderTimeline, Long> {

	List<SaasSalesOrderTimeline> findByTenantIdAndOrderIdOrderByCreatedAtAsc(Long tenantId, Long orderId);
}