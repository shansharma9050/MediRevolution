package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPaymentTransaction;
import com.example.medi.saas.enums.SaasPaymentPartyType;
import com.example.medi.saas.enums.SaasPaymentStatus;
import com.example.medi.saas.enums.SaasPaymentTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasPaymentTransactionRepository extends JpaRepository<SaasPaymentTransaction, Long> {

	List<SaasPaymentTransaction> findByTenantIdOrderByPaymentDateDescCreatedAtDesc(Long tenantId);

	Optional<SaasPaymentTransaction> findByIdAndTenantId(Long id, Long tenantId);

	List<SaasPaymentTransaction> findByTenantIdAndPartyTypeAndPartyIdOrderByPaymentDateDescCreatedAtDesc(Long tenantId,
			SaasPaymentPartyType partyType, Long partyId);

	long countByTenantIdAndPaymentStatusNot(Long tenantId, SaasPaymentStatus paymentStatus);

	@Query("""
			SELECT p
			FROM SaasPaymentTransaction p
			WHERE p.tenantId = :tenantId
			  AND (
			        LOWER(p.paymentNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(p.partyName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(p.partyCode, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(p.referenceNumber, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(p.referenceNumberSnapshot, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY p.paymentDate DESC, p.createdAt DESC
			""")
	List<SaasPaymentTransaction> searchPayments(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	@Query("""
			SELECT COALESCE(SUM(p.amount), 0)
			FROM SaasPaymentTransaction p
			WHERE p.tenantId = :tenantId
			  AND p.transactionType = :transactionType
			  AND p.paymentStatus <>
			      com.example.medi.saas.enums.SaasPaymentStatus.CANCELLED
			""")
	BigDecimal sumAmountByTransactionType(@Param("tenantId") Long tenantId,

			@Param("transactionType") SaasPaymentTransactionType transactionType);
}