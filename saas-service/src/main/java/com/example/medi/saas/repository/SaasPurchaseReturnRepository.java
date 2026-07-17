package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPurchaseReturn;
import com.example.medi.saas.enums.SaasPurchaseReturnStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasPurchaseReturnRepository extends JpaRepository<SaasPurchaseReturn, Long> {

	List<SaasPurchaseReturn> findByTenantIdOrderByReturnDateDescCreatedAtDesc(Long tenantId);

	Optional<SaasPurchaseReturn> findByIdAndTenantId(Long id, Long tenantId);

	long countByTenantIdAndReturnStatusNot(Long tenantId, SaasPurchaseReturnStatus returnStatus);

	@Query("""
			SELECT r
			FROM SaasPurchaseReturn r
			WHERE r.tenantId = :tenantId
			  AND (
			        LOWER(r.returnNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(r.purchaseNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(r.supplierName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(r.supplierInvoiceNumber, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(r.debitNoteNumber, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY r.returnDate DESC, r.createdAt DESC
			""")
	List<SaasPurchaseReturn> searchReturns(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	@Query("""
			SELECT COALESCE(SUM(r.grandTotal), 0)
			FROM SaasPurchaseReturn r
			WHERE r.tenantId = :tenantId
			  AND r.returnStatus <>
			      com.example.medi.saas.enums.SaasPurchaseReturnStatus.CANCELLED
			""")
	BigDecimal sumReturnAmount(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(r.totalQuantity), 0)
			FROM SaasPurchaseReturn r
			WHERE r.tenantId = :tenantId
			  AND r.returnStatus <>
			      com.example.medi.saas.enums.SaasPurchaseReturnStatus.CANCELLED
			""")
	Long sumReturnedQuantity(@Param("tenantId") Long tenantId);
}