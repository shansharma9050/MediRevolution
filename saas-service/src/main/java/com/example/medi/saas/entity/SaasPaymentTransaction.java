package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPaymentMode;
import com.example.medi.saas.enums.SaasPaymentPartyType;
import com.example.medi.saas.enums.SaasPaymentStatus;
import com.example.medi.saas.enums.SaasPaymentTransactionType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_payment_transactions", uniqueConstraints = {
		@UniqueConstraint(name = "uk_saas_payment_number", columnNames = { "tenant_id",
				"payment_number" }) }, indexes = { @Index(name = "idx_saas_payment_tenant", columnList = "tenant_id"),
						@Index(name = "idx_saas_payment_party", columnList = "tenant_id,party_type,party_id"),
						@Index(name = "idx_saas_payment_date", columnList = "tenant_id,payment_date"),
						@Index(name = "idx_saas_payment_type", columnList = "tenant_id,transaction_type"),
						@Index(name = "idx_saas_payment_reference", columnList = "tenant_id,reference_type,reference_id") })
@Data
@NoArgsConstructor
public class SaasPaymentTransaction {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "payment_number", nullable = false, length = 80)
	private String paymentNumber;

	@Column(name = "payment_date", nullable = false)
	private LocalDate paymentDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "transaction_type", nullable = false, length = 40)
	private SaasPaymentTransactionType transactionType;

	@Enumerated(EnumType.STRING)
	@Column(name = "party_type", nullable = false, length = 30)
	private SaasPaymentPartyType partyType;

	@Column(name = "party_id", nullable = false)
	private Long partyId;

	@Column(name = "party_code", length = 50)
	private String partyCode;

	@Column(name = "party_name", nullable = false, length = 180)
	private String partyName;

	@Column(name = "amount", nullable = false, precision = 15, scale = 2)
	private BigDecimal amount = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_mode", nullable = false, length = 40)
	private SaasPaymentMode paymentMode;

	@Column(name = "reference_number", length = 120)
	private String referenceNumber;

	@Column(name = "bank_name", length = 150)
	private String bankName;

	@Column(name = "cheque_number", length = 80)
	private String chequeNumber;

	@Column(name = "cheque_date")
	private LocalDate chequeDate;

	@Column(name = "upi_transaction_id", length = 150)
	private String upiTransactionId;

	@Column(name = "reference_type", length = 50)
	private String referenceType;

	@Column(name = "reference_id")
	private Long referenceId;

	@Column(name = "reference_number_snapshot", length = 100)
	private String referenceNumberSnapshot;

	@Column(name = "outstanding_before", nullable = false, precision = 15, scale = 2)
	private BigDecimal outstandingBefore = BigDecimal.ZERO;

	@Column(name = "outstanding_after", nullable = false, precision = 15, scale = 2)
	private BigDecimal outstandingAfter = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_status", nullable = false, length = 30)
	private SaasPaymentStatus paymentStatus;

	@Column(length = 1000)
	private String remarks;

	@Column(name = "created_by_auth_user_id")
	private Long createdByAuthUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@PrePersist
	public void prePersist() {

		if (paymentDate == null) {
			paymentDate = LocalDate.now();
		}

		if (amount == null) {
			amount = BigDecimal.ZERO;
		}

		if (outstandingBefore == null) {
			outstandingBefore = BigDecimal.ZERO;
		}

		if (outstandingAfter == null) {
			outstandingAfter = BigDecimal.ZERO;
		}

		if (paymentStatus == null) {
			paymentStatus = SaasPaymentStatus.POSTED;
		}

		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	@PreUpdate
	public void preUpdate() {
		updatedAt = LocalDateTime.now();
	}
}