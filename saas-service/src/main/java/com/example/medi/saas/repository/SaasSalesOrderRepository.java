package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSalesOrder;
import com.example.medi.saas.enums.SaasSalesOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasSalesOrderRepository extends JpaRepository<SaasSalesOrder, Long> {

	List<SaasSalesOrder> findByTenantIdOrderByOrderDateDescCreatedAtDesc(Long tenantId);

	Optional<SaasSalesOrder> findByIdAndTenantId(Long id, Long tenantId);

	long countByTenantId(Long tenantId);

	long countByTenantIdAndOrderStatus(Long tenantId, SaasSalesOrderStatus orderStatus);

	@Query("""
			SELECT o
			FROM SaasSalesOrder o
			WHERE o.tenantId = :tenantId
			  AND (
			        LOWER(o.orderNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(o.customerName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(o.customerCode, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(o.customerMobile, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(o.customerGstin, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY o.orderDate DESC, o.createdAt DESC
			""")
	List<SaasSalesOrder> searchOrders(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	@Query("""
			SELECT COALESCE(SUM(o.grandTotal), 0)
			FROM SaasSalesOrder o
			WHERE o.tenantId = :tenantId
			  AND o.orderStatus NOT IN (
			        com.example.medi.saas.enums.SaasSalesOrderStatus.REJECTED,
			        com.example.medi.saas.enums.SaasSalesOrderStatus.CANCELLED
			  )
			""")
	BigDecimal sumOrderValue(@Param("tenantId") Long tenantId);
}