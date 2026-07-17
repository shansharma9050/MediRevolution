package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasPaymentResponse {

	private Long id;

	private Long tenantId;

	private String paymentNumber;

	private LocalDate paymentDate;

	private String transactionType;

	private String partyType;

	private Long partyId;

	private String partyCode;

	private String partyName;

	private BigDecimal amount;

	private String paymentMode;

	private String referenceNumber;

	private String bankName;

	private String chequeNumber;

	private LocalDate chequeDate;

	private String upiTransactionId;

	private String referenceType;

	private Long referenceId;

	private String referenceNumberSnapshot;

	private BigDecimal outstandingBefore;

	private BigDecimal outstandingAfter;

	private String paymentStatus;

	private String remarks;

	private LocalDateTime createdAt;
}