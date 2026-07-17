package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasPaymentRequest;
import com.example.medi.saas.dto.SaasPaymentResponse;
import com.example.medi.saas.dto.SaasPaymentSummaryResponse;
import com.example.medi.saas.entity.SaasCustomer;
import com.example.medi.saas.entity.SaasPartyLedgerEntry;
import com.example.medi.saas.entity.SaasPaymentTransaction;
import com.example.medi.saas.entity.SaasPurchase;
import com.example.medi.saas.entity.SaasPurchaseReturn;
import com.example.medi.saas.entity.SaasSale;
import com.example.medi.saas.entity.SaasSalesReturn;
import com.example.medi.saas.entity.SaasSupplier;
import com.example.medi.saas.enums.SaasLedgerEntryType;
import com.example.medi.saas.enums.SaasPaymentMode;
import com.example.medi.saas.enums.SaasPaymentPartyType;
import com.example.medi.saas.enums.SaasPaymentStatus;
import com.example.medi.saas.enums.SaasPaymentTransactionType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasCustomerRepository;
import com.example.medi.saas.repository.SaasPaymentTransactionRepository;
import com.example.medi.saas.repository.SaasPurchaseRepository;
import com.example.medi.saas.repository.SaasPurchaseReturnRepository;
import com.example.medi.saas.repository.SaasSaleRepository;
import com.example.medi.saas.repository.SaasSalesReturnRepository;
import com.example.medi.saas.repository.SaasSupplierRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class SaasPaymentService {

	private final SaasPaymentTransactionRepository paymentRepository;

	private final SaasSupplierRepository supplierRepository;

	private final SaasCustomerRepository customerRepository;

	private final SaasPurchaseRepository purchaseRepository;

	private final SaasSaleRepository saleRepository;

	private final SaasPurchaseReturnRepository purchaseReturnRepository;

	private final SaasSalesReturnRepository salesReturnRepository;

	private final SaasPartyLedgerService ledgerService;

	private final TenantAccessService tenantAccessService;

	private final SaasPermissionService permissionService;

	public SaasPaymentService(SaasPaymentTransactionRepository paymentRepository,
			SaasSupplierRepository supplierRepository, SaasCustomerRepository customerRepository,
			SaasPurchaseRepository purchaseRepository, SaasSaleRepository saleRepository,
			SaasPurchaseReturnRepository purchaseReturnRepository, SaasSalesReturnRepository salesReturnRepository,
			SaasPartyLedgerService ledgerService, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService) {

		this.paymentRepository = paymentRepository;

		this.supplierRepository = supplierRepository;

		this.customerRepository = customerRepository;

		this.purchaseRepository = purchaseRepository;

		this.saleRepository = saleRepository;

		this.purchaseReturnRepository = purchaseReturnRepository;

		this.salesReturnRepository = salesReturnRepository;

		this.ledgerService = ledgerService;

		this.tenantAccessService = tenantAccessService;

		this.permissionService = permissionService;
	}

	public List<SaasPaymentResponse> getPayments(Long tenantId) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PAYMENTS, SaasPermissionAction.VIEW);

		return paymentRepository.findByTenantIdOrderByPaymentDateDescCreatedAtDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	public List<SaasPaymentResponse> searchPayments(Long tenantId, String keyword) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PAYMENTS, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {

			return getPayments(tenantId);
		}

		return paymentRepository.searchPayments(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	public SaasPaymentResponse getPayment(Long tenantId, Long paymentId) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PAYMENTS, SaasPermissionAction.VIEW);

		return toResponse(findPayment(tenantId, paymentId));
	}

	public SaasPaymentSummaryResponse getSummary(Long tenantId) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PAYMENTS, SaasPermissionAction.VIEW);

		return new SaasPaymentSummaryResponse(

				paymentRepository.countByTenantIdAndPaymentStatusNot(tenantId, SaasPaymentStatus.CANCELLED),

				money(paymentRepository.sumAmountByTransactionType(tenantId,
						SaasPaymentTransactionType.SUPPLIER_PAYMENT)),

				money(paymentRepository.sumAmountByTransactionType(tenantId,
						SaasPaymentTransactionType.CUSTOMER_RECEIPT)),

				ledgerService.getTotalBusinessOutstanding(tenantId, SaasPaymentPartyType.SUPPLIER),

				ledgerService.getTotalBusinessOutstanding(tenantId, SaasPaymentPartyType.CUSTOMER));
	}

	@Transactional
	public SaasPaymentResponse createPayment(SaasPaymentRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PAYMENTS, SaasPermissionAction.CREATE);

		SaasPaymentTransactionType transactionType = parseTransactionType(request.getTransactionType());

		SaasPaymentPartyType partyType = resolvePartyType(transactionType);

		PartySnapshot party = findParty(tenantId, partyType, request.getPartyId());

		validatePaymentReference(tenantId, transactionType, party.id(), request.getReferenceType(),
				request.getReferenceId());

		SaasPaymentMode paymentMode = parsePaymentMode(request.getPaymentMode());

		validatePaymentModeFields(paymentMode, request);

		BigDecimal amount = positiveAmount(request.getAmount(), "Payment amount");

		BigDecimal outstandingBefore = ledgerService.getBusinessOutstanding(tenantId, partyType, party.id());

		if (outstandingBefore.compareTo(BigDecimal.ZERO) <= 0) {

			throw new RuntimeException(
					partyType == SaasPaymentPartyType.SUPPLIER ? "Supplier has no outstanding payable balance"
							: "Customer has no outstanding receivable balance");
		}

		if (amount.compareTo(outstandingBefore) > 0) {

			throw new RuntimeException(
					"Payment amount cannot exceed outstanding balance. Outstanding: " + outstandingBefore);
		}

		LocalDate paymentDate = request.getPaymentDate() == null ? LocalDate.now() : request.getPaymentDate();

		if (paymentDate.isAfter(LocalDate.now())) {

			throw new RuntimeException("Payment date cannot be in the future");
		}

		SaasPaymentTransaction payment = new SaasPaymentTransaction();

		payment.setTenantId(tenantId);

		payment.setPaymentNumber(generatePaymentNumber(tenantId, transactionType));

		payment.setPaymentDate(paymentDate);

		payment.setTransactionType(transactionType);

		payment.setPartyType(partyType);

		payment.setPartyId(party.id());

		payment.setPartyCode(party.code());

		payment.setPartyName(party.name());

		payment.setAmount(amount);

		payment.setPaymentMode(paymentMode);

		payment.setReferenceNumber(normalizeOptional(request.getReferenceNumber()));

		payment.setBankName(normalizeOptional(request.getBankName()));

		payment.setChequeNumber(normalizeOptional(request.getChequeNumber()));

		payment.setChequeDate(request.getChequeDate());

		payment.setUpiTransactionId(normalizeOptional(request.getUpiTransactionId()));

		payment.setReferenceType(normalizeUppercaseOptional(request.getReferenceType()));

		payment.setReferenceId(request.getReferenceId());

		/*
		 * Original bank/UPI/cheque transaction reference snapshot. Isko payment number
		 * se overwrite nahi karna hai.
		 */
		payment.setReferenceNumberSnapshot(normalizeOptional(request.getReferenceNumber()));

		payment.setOutstandingBefore(outstandingBefore);

		payment.setOutstandingAfter(money(outstandingBefore.subtract(amount)));

		payment.setPaymentStatus(SaasPaymentStatus.POSTED);

		payment.setRemarks(normalizeOptional(request.getRemarks()));

		payment.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasPaymentTransaction savedPayment = paymentRepository.save(payment);

		createPaymentLedgerEntry(savedPayment);

		return toResponse(savedPayment);
	}

	private SaasPartyLedgerEntry createPaymentLedgerEntry(SaasPaymentTransaction payment) {

		if (SaasPaymentTransactionType.SUPPLIER_PAYMENT.equals(payment.getTransactionType())) {

			return ledgerService.postLedgerEntry(payment.getTenantId(), SaasPaymentPartyType.SUPPLIER,
					payment.getPartyId(), payment.getPartyCode(), payment.getPartyName(), payment.getPaymentDate(),
					SaasLedgerEntryType.SUPPLIER_PAYMENT, "PAYMENT", payment.getId(), payment.getPaymentNumber(),
					payment.getAmount(), BigDecimal.ZERO, buildPaymentNarration(payment));
		}

		return ledgerService.postLedgerEntry(payment.getTenantId(), SaasPaymentPartyType.CUSTOMER, payment.getPartyId(),
				payment.getPartyCode(), payment.getPartyName(), payment.getPaymentDate(),
				SaasLedgerEntryType.CUSTOMER_RECEIPT, "PAYMENT", payment.getId(), payment.getPaymentNumber(),
				BigDecimal.ZERO, payment.getAmount(), buildPaymentNarration(payment));
	}

	private String buildPaymentNarration(SaasPaymentTransaction payment) {

		String base = SaasPaymentTransactionType.SUPPLIER_PAYMENT.equals(payment.getTransactionType())
				? "Payment made to supplier"
				: "Receipt collected from customer";

		String reference = normalizeOptional(payment.getReferenceNumber());

		if (reference != null) {

			base += ". Reference: " + reference;
		}

		String remarks = normalizeOptional(payment.getRemarks());

		if (remarks != null) {

			base += ". " + remarks;
		}

		return base;
	}

	private void validatePaymentReference(Long tenantId, SaasPaymentTransactionType transactionType, Long partyId,
			String referenceTypeValue, Long referenceId) {

		String referenceType = normalizeUppercaseOptional(referenceTypeValue);

		if (referenceType == null && referenceId == null) {

			return;
		}

		if (referenceType == null || referenceId == null) {

			throw new RuntimeException("Reference type and reference id must be provided together");
		}

		if (referenceId <= 0) {

			throw new RuntimeException("Reference id must be greater than 0");
		}

		if (SaasPaymentTransactionType.SUPPLIER_PAYMENT.equals(transactionType)) {

			validateSupplierPaymentReference(tenantId, partyId, referenceType, referenceId);

			return;
		}

		validateCustomerReceiptReference(tenantId, partyId, referenceType, referenceId);
	}

	private void validateSupplierPaymentReference(Long tenantId, Long supplierId, String referenceType,
			Long referenceId) {

		switch (referenceType) {

		case "PURCHASE" -> {

			SaasPurchase purchase = purchaseRepository.findByIdAndTenantId(referenceId, tenantId)
					.orElseThrow(() -> new RuntimeException("Referenced purchase not found"));

			if (!supplierId.equals(purchase.getSupplierId())) {

				throw new RuntimeException("Referenced purchase does not belong to selected supplier");
			}
		}

		case "PURCHASE_RETURN" -> {

			SaasPurchaseReturn purchaseReturn = purchaseReturnRepository.findByIdAndTenantId(referenceId, tenantId)
					.orElseThrow(() -> new RuntimeException("Referenced purchase return not found"));

			if (!supplierId.equals(purchaseReturn.getSupplierId())) {

				throw new RuntimeException("Referenced purchase return does not belong to selected supplier");
			}
		}

		case "OPENING_BALANCE", "OTHER" -> {
			/*
			 * Generic reference types. Party and tenant are already validated.
			 */
		}

		default -> throw new RuntimeException("Invalid supplier payment reference type");
		}
	}

	private void validateCustomerReceiptReference(Long tenantId, Long customerId, String referenceType,
			Long referenceId) {

		switch (referenceType) {

		case "SALE" -> {

			SaasSale sale = saleRepository.findByIdAndTenantId(referenceId, tenantId)
					.orElseThrow(() -> new RuntimeException("Referenced sale not found"));

			if (!customerId.equals(sale.getCustomerId())) {

				throw new RuntimeException("Referenced sale does not belong to selected customer");
			}
		}

		case "SALES_RETURN" -> {

			SaasSalesReturn salesReturn = salesReturnRepository.findByIdAndTenantId(referenceId, tenantId)
					.orElseThrow(() -> new RuntimeException("Referenced sales return not found"));

			if (!customerId.equals(salesReturn.getCustomerId())) {

				throw new RuntimeException("Referenced sales return does not belong to selected customer");
			}
		}

		case "OPENING_BALANCE", "OTHER" -> {
			/*
			 * Generic reference types. Party and tenant are already validated.
			 */
		}

		default -> throw new RuntimeException("Invalid customer receipt reference type");
		}
	}

	private PartySnapshot findParty(Long tenantId, SaasPaymentPartyType partyType, Long partyId) {

		if (partyId == null) {

			throw new RuntimeException("Party is required");
		}

		if (SaasPaymentPartyType.SUPPLIER.equals(partyType)) {

			SaasSupplier supplier = supplierRepository.findByIdAndTenantId(partyId, tenantId)
					.orElseThrow(() -> new RuntimeException("Supplier not found"));

			if (Boolean.FALSE.equals(supplier.getActive())) {

				throw new RuntimeException("Selected supplier is inactive");
			}

			return new PartySnapshot(supplier.getId(), supplier.getSupplierCode(), supplier.getSupplierName());
		}

		SaasCustomer customer = customerRepository.findByIdAndTenantId(partyId, tenantId)
				.orElseThrow(() -> new RuntimeException("Customer not found"));

		if (Boolean.FALSE.equals(customer.getActive())) {

			throw new RuntimeException("Selected customer is inactive");
		}

		return new PartySnapshot(customer.getId(), customer.getCustomerCode(), customer.getCustomerName());
	}

	private SaasPaymentTransaction findPayment(Long tenantId, Long paymentId) {

		if (paymentId == null) {

			throw new RuntimeException("Payment id is required");
		}

		return paymentRepository.findByIdAndTenantId(paymentId, tenantId)
				.orElseThrow(() -> new RuntimeException("Payment transaction not found"));
	}

	private void validateRequest(SaasPaymentRequest request) {

		if (request == null) {

			throw new RuntimeException("Payment request is required");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required");
		}

		parseTransactionType(request.getTransactionType());

		if (request.getPartyId() == null) {

			throw new RuntimeException("Party is required");
		}

		positiveAmount(request.getAmount(), "Payment amount");

		parsePaymentMode(request.getPaymentMode());

		validateReferencePair(request.getReferenceType(), request.getReferenceId());
	}

	private void validateReferencePair(String referenceType, Long referenceId) {

		String normalizedType = normalizeOptional(referenceType);

		if (normalizedType == null && referenceId == null) {

			return;
		}

		if (normalizedType == null || referenceId == null) {

			throw new RuntimeException("Reference type and reference id must be provided together");
		}

		if (referenceId <= 0) {

			throw new RuntimeException("Reference id must be greater than 0");
		}
	}

	private void validatePaymentModeFields(SaasPaymentMode paymentMode, SaasPaymentRequest request) {

		if (SaasPaymentMode.CHEQUE.equals(paymentMode)) {

			normalizeRequired(request.getChequeNumber(), "Cheque number");

			if (request.getChequeDate() == null) {

				throw new RuntimeException("Cheque date is required");
			}

			normalizeRequired(request.getBankName(), "Bank name");
		}

		if (SaasPaymentMode.UPI.equals(paymentMode) && normalizeOptional(request.getUpiTransactionId()) == null) {

			throw new RuntimeException("UPI transaction id is required");
		}

		if (SaasPaymentMode.BANK_TRANSFER.equals(paymentMode) || SaasPaymentMode.NEFT.equals(paymentMode)
				|| SaasPaymentMode.RTGS.equals(paymentMode) || SaasPaymentMode.IMPS.equals(paymentMode)) {

			normalizeRequired(request.getReferenceNumber(), "Bank reference number");
		}
	}

	private SaasPaymentTransactionType parseTransactionType(String value) {

		if (value == null || value.isBlank()) {

			throw new RuntimeException("Transaction type is required");
		}

		try {

			return SaasPaymentTransactionType.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid payment transaction type");
		}
	}

	private SaasPaymentMode parsePaymentMode(String value) {

		if (value == null || value.isBlank()) {

			throw new RuntimeException("Payment mode is required");
		}

		try {

			return SaasPaymentMode.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid payment mode");
		}
	}

	private SaasPaymentPartyType resolvePartyType(SaasPaymentTransactionType transactionType) {

		if (SaasPaymentTransactionType.SUPPLIER_PAYMENT.equals(transactionType)) {

			return SaasPaymentPartyType.SUPPLIER;
		}

		return SaasPaymentPartyType.CUSTOMER;
	}

	private String generatePaymentNumber(Long tenantId, SaasPaymentTransactionType transactionType) {

		String prefix = SaasPaymentTransactionType.SUPPLIER_PAYMENT.equals(transactionType) ? "SPY" : "CRT";

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return prefix + "-" + tenantId + "-" + timestamp + "-" + random;
	}

	private SaasPaymentResponse toResponse(SaasPaymentTransaction payment) {

		return new SaasPaymentResponse(payment.getId(), payment.getTenantId(), payment.getPaymentNumber(),
				payment.getPaymentDate(),

				payment.getTransactionType() == null ? null : payment.getTransactionType().name(),

				payment.getPartyType() == null ? null : payment.getPartyType().name(),

				payment.getPartyId(), payment.getPartyCode(), payment.getPartyName(),

				money(payment.getAmount()),

				payment.getPaymentMode() == null ? null : payment.getPaymentMode().name(),

				payment.getReferenceNumber(), payment.getBankName(), payment.getChequeNumber(), payment.getChequeDate(),
				payment.getUpiTransactionId(), payment.getReferenceType(), payment.getReferenceId(),
				payment.getReferenceNumberSnapshot(),

				money(payment.getOutstandingBefore()),

				money(payment.getOutstandingAfter()),

				payment.getPaymentStatus() == null ? null : payment.getPaymentStatus().name(),

				payment.getRemarks(), payment.getCreatedAt());
	}

	private void validateTenantAccess(Long tenantId) {

		if (tenantId == null) {

			throw new RuntimeException("tenantId is required");
		}

		tenantAccessService.validateTenantAccess(tenantId);
	}

	private BigDecimal money(BigDecimal value) {

		return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal positiveAmount(BigDecimal value, String fieldName) {

		BigDecimal amount = money(value);

		if (amount.compareTo(BigDecimal.ZERO) <= 0) {

			throw new RuntimeException(fieldName + " must be greater than 0");
		}

		return amount;
	}

	private String normalizeRequired(String value, String fieldName) {

		String normalized = normalizeOptional(value);

		if (normalized == null) {

			throw new RuntimeException(fieldName + " is required");
		}

		return normalized;
	}

	private String normalizeUppercaseOptional(String value) {

		String normalized = normalizeOptional(value);

		return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
	}

	private String normalizeOptional(String value) {

		if (value == null) {

			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}

	private record PartySnapshot(Long id, String code, String name) {
	}
}