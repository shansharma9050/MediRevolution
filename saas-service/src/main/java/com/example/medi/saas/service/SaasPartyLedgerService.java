package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasLedgerEntryResponse;
import com.example.medi.saas.dto.SaasPartyLedgerResponse;
import com.example.medi.saas.dto.SaasPartyOutstandingResponse;
import com.example.medi.saas.entity.SaasCustomer;
import com.example.medi.saas.entity.SaasPartyLedgerEntry;
import com.example.medi.saas.entity.SaasSupplier;
import com.example.medi.saas.enums.SaasLedgerBalanceType;
import com.example.medi.saas.enums.SaasLedgerEntryType;
import com.example.medi.saas.enums.SaasPaymentPartyType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasCustomerRepository;
import com.example.medi.saas.repository.SaasPartyLedgerEntryRepository;
import com.example.medi.saas.repository.SaasSupplierRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class SaasPartyLedgerService {

	private final SaasPartyLedgerEntryRepository ledgerRepository;
	private final SaasSupplierRepository supplierRepository;
	private final SaasCustomerRepository customerRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;

	public SaasPartyLedgerService(SaasPartyLedgerEntryRepository ledgerRepository,
			SaasSupplierRepository supplierRepository, SaasCustomerRepository customerRepository,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService) {
		this.ledgerRepository = ledgerRepository;
		this.supplierRepository = supplierRepository;
		this.customerRepository = customerRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
	}

	public SaasPartyLedgerResponse getPartyLedger(Long tenantId, String partyTypeValue, Long partyId) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PAYMENTS, SaasPermissionAction.VIEW);

		SaasPaymentPartyType partyType = parsePartyType(partyTypeValue);

		PartySnapshot party = findParty(tenantId, partyType, partyId);

		List<SaasPartyLedgerEntry> entries = ledgerRepository
				.findByTenantIdAndPartyTypeAndPartyIdOrderByEntryDateAscCreatedAtAscIdAsc(tenantId, partyType, partyId);

		BigDecimal totalDebit = entries.stream().map(SaasPartyLedgerEntry::getDebitAmount).map(this::money)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal totalCredit = entries.stream().map(SaasPartyLedgerEntry::getCreditAmount).map(this::money)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal signedBalance = money(totalDebit.subtract(totalCredit));

		return new SaasPartyLedgerResponse(partyType.name(), party.id(), party.code(), party.name(),
				BigDecimal.ZERO.setScale(2), money(totalDebit), money(totalCredit), signedBalance.abs(),
				resolveBusinessBalanceType(partyType, signedBalance).name(),
				entries.stream().map(this::toResponse).toList());
	}

	public List<SaasPartyOutstandingResponse> getOutstandingParties(Long tenantId, String partyTypeValue) {

		validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PAYMENTS, SaasPermissionAction.VIEW);

		SaasPaymentPartyType partyType = parsePartyType(partyTypeValue);

		if (SaasPaymentPartyType.SUPPLIER.equals(partyType)) {

			return supplierRepository.findByTenantIdOrderBySupplierNameAsc(tenantId).stream()
					.filter(supplier -> !Boolean.FALSE.equals(supplier.getActive()))
					.map(supplier -> buildSupplierOutstanding(tenantId, supplier))
					.filter(response -> response.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0)
					.sorted(Comparator.comparing(SaasPartyOutstandingResponse::getPartyName,
							String.CASE_INSENSITIVE_ORDER))
					.toList();
		}

		return customerRepository.findByTenantIdOrderByCustomerNameAsc(tenantId).stream()
				.filter(customer -> !Boolean.FALSE.equals(customer.getActive()))
				.map(customer -> buildCustomerOutstanding(tenantId, customer))
				.filter(response -> response.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0)
				.sorted(Comparator.comparing(SaasPartyOutstandingResponse::getPartyName, String.CASE_INSENSITIVE_ORDER))
				.toList();
	}

	public BigDecimal getSignedPartyBalance(Long tenantId, SaasPaymentPartyType partyType, Long partyId) {

		return money(ledgerRepository.calculatePartyBalance(tenantId, partyType, partyId));
	}

	public BigDecimal getBusinessOutstanding(Long tenantId, SaasPaymentPartyType partyType, Long partyId) {

		BigDecimal signedBalance = getSignedPartyBalance(tenantId, partyType, partyId);

		if (SaasPaymentPartyType.CUSTOMER.equals(partyType)) {

			return signedBalance.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
		}

		return signedBalance.negate().max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
	}

	public BigDecimal getTotalBusinessOutstanding(Long tenantId, SaasPaymentPartyType partyType) {

		if (tenantId == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (partyType == null) {
			throw new RuntimeException("Party type is required");
		}

		if (SaasPaymentPartyType.SUPPLIER.equals(partyType)) {

			return supplierRepository.findByTenantIdOrderBySupplierNameAsc(tenantId).stream()
					.filter(supplier -> !Boolean.FALSE.equals(supplier.getActive()))
					.map(supplier -> getBusinessOutstanding(tenantId, SaasPaymentPartyType.SUPPLIER, supplier.getId()))
					.reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
		}

		return customerRepository.findByTenantIdOrderByCustomerNameAsc(tenantId).stream()
				.filter(customer -> !Boolean.FALSE.equals(customer.getActive()))
				.map(customer -> getBusinessOutstanding(tenantId, SaasPaymentPartyType.CUSTOMER, customer.getId()))
				.reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
	}

	@Transactional
	public SaasPartyLedgerEntry postLedgerEntry(Long tenantId, SaasPaymentPartyType partyType, Long partyId,
			String partyCode, String partyName, LocalDate entryDate, SaasLedgerEntryType entryType,
			String referenceType, Long referenceId, String referenceNumber, BigDecimal debitAmount,
			BigDecimal creditAmount, String narration) {

		validatePostRequest(tenantId, partyType, partyId, partyName, entryType, referenceType, debitAmount,
				creditAmount);

		if (referenceId != null && ledgerRepository.existsByTenantIdAndReferenceTypeAndReferenceIdAndEntryType(tenantId,
				referenceType, referenceId, entryType)) {

			return ledgerRepository
					.findByTenantIdAndPartyTypeAndPartyIdOrderByEntryDateAscCreatedAtAscIdAsc(tenantId, partyType,
							partyId)
					.stream()
					.filter(entry -> entryType.equals(entry.getEntryType())
							&& referenceType.equalsIgnoreCase(entry.getReferenceType())
							&& referenceId.equals(entry.getReferenceId()))
					.findFirst().orElseThrow(() -> new RuntimeException("Duplicate ledger reference detected"));
		}

		BigDecimal debit = nonNegativeAmount(debitAmount, "Debit amount");

		BigDecimal credit = nonNegativeAmount(creditAmount, "Credit amount");

		if (debit.compareTo(BigDecimal.ZERO) > 0 && credit.compareTo(BigDecimal.ZERO) > 0) {

			throw new RuntimeException("A ledger entry cannot contain both debit and credit amounts");
		}

		if (debit.compareTo(BigDecimal.ZERO) == 0 && credit.compareTo(BigDecimal.ZERO) == 0) {

			throw new RuntimeException("Ledger debit or credit amount is required");
		}

		BigDecimal previousBalance = getSignedPartyBalance(tenantId, partyType, partyId);

		BigDecimal runningBalance = money(previousBalance.add(debit).subtract(credit));

		SaasPartyLedgerEntry entry = new SaasPartyLedgerEntry();

		entry.setTenantId(tenantId);
		entry.setPartyType(partyType);
		entry.setPartyId(partyId);
		entry.setPartyCode(normalizeOptional(partyCode));
		entry.setPartyName(normalizeRequired(partyName, "Party name"));

		entry.setEntryDate(entryDate == null ? LocalDate.now() : entryDate);

		entry.setEntryType(entryType);

		entry.setReferenceType(normalizeRequired(referenceType, "Reference type"));

		entry.setReferenceId(referenceId);

		entry.setReferenceNumber(normalizeOptional(referenceNumber));

		entry.setDebitAmount(debit);
		entry.setCreditAmount(credit);
		entry.setRunningBalance(runningBalance);

		entry.setBalanceType(resolveSignedBalanceType(runningBalance));

		entry.setNarration(normalizeOptional(narration));

		entry.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		return ledgerRepository.save(entry);
	}

	private SaasPartyOutstandingResponse buildSupplierOutstanding(Long tenantId, SaasSupplier supplier) {

		BigDecimal outstanding = getBusinessOutstanding(tenantId, SaasPaymentPartyType.SUPPLIER, supplier.getId());

		return new SaasPartyOutstandingResponse(SaasPaymentPartyType.SUPPLIER.name(), supplier.getId(),
				supplier.getSupplierCode(), supplier.getSupplierName(), outstanding,
				outstanding.compareTo(BigDecimal.ZERO) > 0 ? SaasLedgerBalanceType.CREDIT.name()
						: SaasLedgerBalanceType.SETTLED.name());
	}

	private SaasPartyOutstandingResponse buildCustomerOutstanding(Long tenantId, SaasCustomer customer) {

		BigDecimal outstanding = getBusinessOutstanding(tenantId, SaasPaymentPartyType.CUSTOMER, customer.getId());

		return new SaasPartyOutstandingResponse(SaasPaymentPartyType.CUSTOMER.name(), customer.getId(),
				customer.getCustomerCode(), customer.getCustomerName(), outstanding,
				outstanding.compareTo(BigDecimal.ZERO) > 0 ? SaasLedgerBalanceType.DEBIT.name()
						: SaasLedgerBalanceType.SETTLED.name());
	}

	private SaasLedgerEntryResponse toResponse(SaasPartyLedgerEntry entry) {

		SaasLedgerBalanceType businessBalanceType = resolveBusinessBalanceType(entry.getPartyType(),
				entry.getRunningBalance());

		return new SaasLedgerEntryResponse(entry.getId(), entry.getPartyType().name(), entry.getPartyId(),
				entry.getPartyCode(), entry.getPartyName(), entry.getEntryDate(), entry.getEntryType().name(),
				entry.getReferenceType(), entry.getReferenceId(), entry.getReferenceNumber(),
				money(entry.getDebitAmount()), money(entry.getCreditAmount()), money(entry.getRunningBalance()).abs(),
				businessBalanceType.name(), entry.getNarration(), entry.getCreatedAt());
	}

	private PartySnapshot findParty(Long tenantId, SaasPaymentPartyType partyType, Long partyId) {

		if (partyId == null) {
			throw new RuntimeException("Party id is required");
		}

		if (SaasPaymentPartyType.SUPPLIER.equals(partyType)) {

			SaasSupplier supplier = supplierRepository.findByIdAndTenantId(partyId, tenantId)
					.orElseThrow(() -> new RuntimeException("Supplier not found"));

			return new PartySnapshot(supplier.getId(), supplier.getSupplierCode(), supplier.getSupplierName());
		}

		SaasCustomer customer = customerRepository.findByIdAndTenantId(partyId, tenantId)
				.orElseThrow(() -> new RuntimeException("Customer not found"));

		return new PartySnapshot(customer.getId(), customer.getCustomerCode(), customer.getCustomerName());
	}

	private SaasPaymentPartyType parsePartyType(String value) {

		if (value == null || value.isBlank()) {
			throw new RuntimeException("Party type is required");
		}

		try {

			return SaasPaymentPartyType.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid party type");
		}
	}

	private SaasLedgerBalanceType resolveSignedBalanceType(BigDecimal signedBalance) {

		int comparison = money(signedBalance).compareTo(BigDecimal.ZERO);

		if (comparison > 0) {
			return SaasLedgerBalanceType.DEBIT;
		}

		if (comparison < 0) {
			return SaasLedgerBalanceType.CREDIT;
		}

		return SaasLedgerBalanceType.SETTLED;
	}

	private SaasLedgerBalanceType resolveBusinessBalanceType(SaasPaymentPartyType partyType, BigDecimal signedBalance) {

		BigDecimal balance = money(signedBalance);

		if (balance.compareTo(BigDecimal.ZERO) == 0) {

			return SaasLedgerBalanceType.SETTLED;
		}

		if (SaasPaymentPartyType.CUSTOMER.equals(partyType)) {

			return balance.compareTo(BigDecimal.ZERO) > 0 ? SaasLedgerBalanceType.DEBIT : SaasLedgerBalanceType.CREDIT;
		}

		return balance.compareTo(BigDecimal.ZERO) < 0 ? SaasLedgerBalanceType.CREDIT : SaasLedgerBalanceType.DEBIT;
	}

	private void validatePostRequest(Long tenantId, SaasPaymentPartyType partyType, Long partyId, String partyName,
			SaasLedgerEntryType entryType, String referenceType, BigDecimal debitAmount, BigDecimal creditAmount) {

		if (tenantId == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (partyType == null) {
			throw new RuntimeException("Party type is required");
		}

		if (partyId == null) {
			throw new RuntimeException("Party id is required");
		}

		normalizeRequired(partyName, "Party name");

		if (entryType == null) {
			throw new RuntimeException("Ledger entry type is required");
		}

		normalizeRequired(referenceType, "Reference type");

		if (debitAmount == null && creditAmount == null) {

			throw new RuntimeException("Ledger amount is required");
		}
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

	private BigDecimal nonNegativeAmount(BigDecimal value, String fieldName) {

		BigDecimal amount = money(value);

		if (amount.compareTo(BigDecimal.ZERO) < 0) {

			throw new RuntimeException(fieldName + " cannot be negative");
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