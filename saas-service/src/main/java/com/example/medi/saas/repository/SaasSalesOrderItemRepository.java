package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSalesOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasSalesOrderItemRepository extends JpaRepository<SaasSalesOrderItem, Long> {

	List<SaasSalesOrderItem> findByTenantIdAndOrderIdOrderByIdAsc(Long tenantId, Long orderId);
}