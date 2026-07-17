package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasLedgerEntryResponse {

	private Long id;

	private String partyType;

	private Long partyId;

	private String partyCode;

	private String partyName;

	private LocalDate entryDate;

	private String entryType;

	private String referenceType;

	private Long referenceId;

	private String referenceNumber;

	private BigDecimal debitAmount;

	private BigDecimal creditAmount;

	private BigDecimal runningBalance;

	private String balanceType;

	private String narration;

	private LocalDateTime createdAt;
}