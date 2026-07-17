package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasSalesReturn;
import com.example.medi.saas.enums.SaasSalesReturnStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasSalesReturnRepository extends JpaRepository<SaasSalesReturn, Long> {

	List<SaasSalesReturn> findByTenantIdOrderByReturnDateDescCreatedAtDesc(Long tenantId);

	Optional<SaasSalesReturn> findByIdAndTenantId(Long id, Long tenantId);

	long countByTenantIdAndReturnStatusNot(Long tenantId, SaasSalesReturnStatus returnStatus);

	@Query("""
			SELECT r
			FROM SaasSalesReturn r
			WHERE r.tenantId = :tenantId
			  AND (
			        LOWER(r.returnNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(r.saleNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(r.customerName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(r.customerCode, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(r.creditNoteNumber, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY r.returnDate DESC, r.createdAt DESC
			""")
	List<SaasSalesReturn> searchReturns(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	@Query("""
			SELECT COALESCE(SUM(r.totalQuantity), 0)
			FROM SaasSalesReturn r
			WHERE r.tenantId = :tenantId
			  AND r.returnStatus <>
			      com.example.medi.saas.enums.SaasSalesReturnStatus.CANCELLED
			""")
	Long sumReturnedQuantity(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(r.grandTotal), 0)
			FROM SaasSalesReturn r
			WHERE r.tenantId = :tenantId
			  AND r.returnStatus <>
			      com.example.medi.saas.enums.SaasSalesReturnStatus.CANCELLED
			""")
	BigDecimal sumReturnAmount(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(r.refundedAmount), 0)
			FROM SaasSalesReturn r
			WHERE r.tenantId = :tenantId
			  AND r.returnStatus <>
			      com.example.medi.saas.enums.SaasSalesReturnStatus.CANCELLED
			""")
	BigDecimal sumRefundedAmount(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(SUM(r.pendingRefundAmount), 0)
			FROM SaasSalesReturn r
			WHERE r.tenantId = :tenantId
			  AND r.returnStatus <>
			      com.example.medi.saas.enums.SaasSalesReturnStatus.CANCELLED
			""")
	BigDecimal sumPendingRefundAmount(@Param("tenantId") Long tenantId);
}