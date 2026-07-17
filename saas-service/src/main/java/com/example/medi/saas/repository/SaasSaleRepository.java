package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSale;
import com.example.medi.saas.enums.SaasSaleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasSaleRepository extends JpaRepository<SaasSale, Long> {

	List<SaasSale> findByTenantIdOrderBySaleDateDescCreatedAtDesc(Long tenantId);

	Optional<SaasSale> findByIdAndTenantId(Long id, Long tenantId);

	@Query("""
			SELECT s
			FROM SaasSale s
			WHERE s.tenantId = :tenantId
			  AND (
			        LOWER(s.saleNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(s.customerName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(s.customerCode, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(s.customerGstin, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY s.saleDate DESC, s.createdAt DESC
			""")
	List<SaasSale> searchSales(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	long countByTenantIdAndSaleStatusNot(Long tenantId, SaasSaleStatus saleStatus);

	@Query("""
			SELECT COALESCE(SUM(s.grandTotal), 0)
			FROM SaasSale s
			WHERE s.tenantId = :tenantId
			  AND s.saleStatus <>
			      com.example.medi.saas.enums.SaasSaleStatus.CANCELLED
			""")
	BigDecimal sumGrandTotal(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(s.paidAmount), 0)
			FROM SaasSale s
			WHERE s.tenantId = :tenantId
			  AND s.saleStatus <>
			      com.example.medi.saas.enums.SaasSaleStatus.CANCELLED
			""")
	BigDecimal sumPaidAmount(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(s.dueAmount), 0)
			FROM SaasSale s
			WHERE s.tenantId = :tenantId
			  AND s.saleStatus <>
			      com.example.medi.saas.enums.SaasSaleStatus.CANCELLED
			""")
	BigDecimal sumDueAmount(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(s.totalQuantity), 0)
			FROM SaasSale s
			WHERE s.tenantId = :tenantId
			  AND s.saleStatus <>
			      com.example.medi.saas.enums.SaasSaleStatus.CANCELLED
			""")
	Long sumTotalQuantity(@Param("tenantId") Long tenantId);
}