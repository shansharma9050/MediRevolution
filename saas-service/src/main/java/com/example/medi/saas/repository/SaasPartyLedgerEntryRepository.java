package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPartyLedgerEntry;
import com.example.medi.saas.enums.SaasPaymentPartyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasPartyLedgerEntryRepository extends JpaRepository<SaasPartyLedgerEntry, Long> {

	List<SaasPartyLedgerEntry> findByTenantIdAndPartyTypeAndPartyIdOrderByEntryDateAscCreatedAtAscIdAsc(Long tenantId,
			SaasPaymentPartyType partyType, Long partyId);

	List<SaasPartyLedgerEntry> findByTenantIdOrderByEntryDateDescCreatedAtDescIdDesc(Long tenantId);

	Optional<SaasPartyLedgerEntry> findTopByTenantIdAndPartyTypeAndPartyIdOrderByEntryDateDescCreatedAtDescIdDesc(
			Long tenantId, SaasPaymentPartyType partyType, Long partyId);

	boolean existsByTenantIdAndReferenceTypeAndReferenceIdAndEntryType(Long tenantId, String referenceType,
			Long referenceId, com.example.medi.saas.enums.SaasLedgerEntryType entryType);

	@Query("""
			SELECT COALESCE(SUM(e.debitAmount), 0)
			FROM SaasPartyLedgerEntry e
			WHERE e.tenantId = :tenantId
			  AND e.partyType = :partyType
			  AND e.partyId = :partyId
			""")
	BigDecimal sumDebitByParty(@Param("tenantId") Long tenantId,

			@Param("partyType") SaasPaymentPartyType partyType,

			@Param("partyId") Long partyId);

	@Query("""
			SELECT COALESCE(SUM(e.creditAmount), 0)
			FROM SaasPartyLedgerEntry e
			WHERE e.tenantId = :tenantId
			  AND e.partyType = :partyType
			  AND e.partyId = :partyId
			""")
	BigDecimal sumCreditByParty(@Param("tenantId") Long tenantId,

			@Param("partyType") SaasPaymentPartyType partyType,

			@Param("partyId") Long partyId);

	@Query("""
			SELECT COALESCE(SUM(e.debitAmount - e.creditAmount), 0)
			FROM SaasPartyLedgerEntry e
			WHERE e.tenantId = :tenantId
			  AND e.partyType = :partyType
			  AND e.partyId = :partyId
			""")
	BigDecimal calculatePartyBalance(@Param("tenantId") Long tenantId,

			@Param("partyType") SaasPaymentPartyType partyType,

			@Param("partyId") Long partyId);

	@Query("""
			SELECT COALESCE(SUM(e.debitAmount - e.creditAmount), 0)
			FROM SaasPartyLedgerEntry e
			WHERE e.tenantId = :tenantId
			  AND e.partyType = :partyType
			""")
	BigDecimal calculateTotalBalanceByPartyType(@Param("tenantId") Long tenantId,

			@Param("partyType") SaasPaymentPartyType partyType);
}