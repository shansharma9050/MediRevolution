package com.example.medi.saas.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SaasPaymentRequest {

	private Long tenantId;

	private String transactionType;

	private Long partyId;

	private LocalDate paymentDate;

	private BigDecimal amount;

	private String paymentMode;

	private String referenceNumber;

	private String bankName;

	private String chequeNumber;

	private LocalDate chequeDate;

	private String upiTransactionId;

	private String referenceType;

	private Long referenceId;

	private String remarks;
}