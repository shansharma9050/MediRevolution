package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasPartyOutstandingResponse {

	private String partyType;

	private Long partyId;

	private String partyCode;

	private String partyName;

	private BigDecimal outstandingAmount;

	private String balanceType;
}