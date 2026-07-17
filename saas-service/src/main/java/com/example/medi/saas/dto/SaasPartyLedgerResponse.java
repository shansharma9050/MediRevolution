package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class SaasPartyLedgerResponse {

	private String partyType;

	private Long partyId;

	private String partyCode;

	private String partyName;

	private BigDecimal openingBalance;

	private BigDecimal totalDebit;

	private BigDecimal totalCredit;

	private BigDecimal closingBalance;

	private String balanceType;

	private List<SaasLedgerEntryResponse> entries;
}