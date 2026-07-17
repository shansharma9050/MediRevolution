package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasPurchaseRepository extends JpaRepository<SaasPurchase, Long> {

	List<SaasPurchase> findByTenantIdOrderByPurchaseDateDescCreatedAtDesc(Long tenantId);

	Optional<SaasPurchase> findByIdAndTenantId(Long id, Long tenantId);

	Optional<SaasPurchase> findByTenantIdAndPurchaseNumberIgnoreCase(Long tenantId, String purchaseNumber);

	boolean existsByTenantIdAndSupplierIdAndSupplierInvoiceNumberIgnoreCase(Long tenantId, Long supplierId,
			String supplierInvoiceNumber);

	@Query("""
			SELECT p
			FROM SaasPurchase p
			WHERE p.tenantId = :tenantId
			  AND (
			        LOWER(p.purchaseNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(p.supplierName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(p.supplierInvoiceNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY p.purchaseDate DESC, p.createdAt DESC
			""")
	List<SaasPurchase> searchPurchases(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	@Query("""
			SELECT COALESCE(SUM(p.grandTotal), 0)
			FROM SaasPurchase p
			WHERE p.tenantId = :tenantId
			  AND p.purchaseStatus <>
			      com.example.medi.saas.enums.SaasPurchaseStatus.CANCELLED
			""")
	BigDecimal sumGrandTotal(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(p.paidAmount), 0)
			FROM SaasPurchase p
			WHERE p.tenantId = :tenantId
			  AND p.purchaseStatus <>
			      com.example.medi.saas.enums.SaasPurchaseStatus.CANCELLED
			""")
	BigDecimal sumPaidAmount(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(p.dueAmount), 0)
			FROM SaasPurchase p
			WHERE p.tenantId = :tenantId
			  AND p.purchaseStatus <>
			      com.example.medi.saas.enums.SaasPurchaseStatus.CANCELLED
			""")
	BigDecimal sumDueAmount(@Param("tenantId") Long tenantId);

	long countByTenantId(Long tenantId);
}