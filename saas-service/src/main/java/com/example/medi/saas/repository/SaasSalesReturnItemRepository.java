package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSalesReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SaasSalesReturnItemRepository extends JpaRepository<SaasSalesReturnItem, Long> {

	List<SaasSalesReturnItem> findByTenantIdAndSalesReturnIdOrderByIdAsc(Long tenantId, Long salesReturnId);

	@Query("""
			SELECT COALESCE(SUM(i.returnQuantity), 0)
			FROM SaasSalesReturnItem i,
			     SaasSalesReturn r
			WHERE i.salesReturnId = r.id
			  AND i.tenantId = :tenantId
			  AND i.saleStockAllocationId = :allocationId
			  AND r.tenantId = :tenantId
			  AND r.returnStatus <>
			      com.example.medi.saas.enums.SaasSalesReturnStatus.CANCELLED
			""")
	Long sumReturnedQuantityByAllocation(@Param("tenantId") Long tenantId,

			@Param("allocationId") Long allocationId);
}