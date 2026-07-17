package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasLedgerBalanceType;
import com.example.medi.saas.enums.SaasLedgerEntryType;
import com.example.medi.saas.enums.SaasPaymentPartyType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_party_ledger_entries", indexes = {
		@Index(name = "idx_saas_ledger_tenant", columnList = "tenant_id"),
		@Index(name = "idx_saas_ledger_party", columnList = "tenant_id,party_type,party_id"),
		@Index(name = "idx_saas_ledger_date", columnList = "tenant_id,entry_date"),
		@Index(name = "idx_saas_ledger_reference", columnList = "tenant_id,reference_type,reference_id") })
@Data
@NoArgsConstructor
public class SaasPartyLedgerEntry {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Enumerated(EnumType.STRING)
	@Column(name = "party_type", nullable = false, length = 30)
	private SaasPaymentPartyType partyType;

	@Column(name = "party_id", nullable = false)
	private Long partyId;

	@Column(name = "party_code", length = 50)
	private String partyCode;

	@Column(name = "party_name", nullable = false, length = 180)
	private String partyName;

	@Column(name = "entry_date", nullable = false)
	private LocalDate entryDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "entry_type", nullable = false, length = 40)
	private SaasLedgerEntryType entryType;

	@Column(name = "reference_type", nullable = false, length = 50)
	private String referenceType;

	@Column(name = "reference_id")
	private Long referenceId;

	@Column(name = "reference_number", length = 100)
	private String referenceNumber;

	@Column(name = "debit_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal debitAmount = BigDecimal.ZERO;

	@Column(name = "credit_amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal creditAmount = BigDecimal.ZERO;

	@Column(name = "running_balance", nullable = false, precision = 15, scale = 2)
	private BigDecimal runningBalance = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "balance_type", nullable = false, length = 20)
	private SaasLedgerBalanceType balanceType;

	@Column(length = 1000)
	private String narration;

	@Column(name = "created_by_auth_user_id")
	private Long createdByAuthUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {

		if (entryDate == null) {
			entryDate = LocalDate.now();
		}

		if (debitAmount == null) {
			debitAmount = BigDecimal.ZERO;
		}

		if (creditAmount == null) {
			creditAmount = BigDecimal.ZERO;
		}

		if (runningBalance == null) {
			runningBalance = BigDecimal.ZERO;
		}

		if (balanceType == null) {
			balanceType = SaasLedgerBalanceType.SETTLED;
		}

		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}
}