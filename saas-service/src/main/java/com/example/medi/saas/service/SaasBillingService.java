package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.*;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class SaasBillingService {

	private final SaasInvoiceRepository invoiceRepository;
	private final SaasInvoiceItemRepository itemRepository;
	private final SaasPaymentReceiptRepository receiptRepository;
	private final SaasPatientRepository patientRepository;
	private final SaasOpdVisitRepository opdRepository;
	private final SaasIpdAdmissionRepository admissionRepository;
	private final SaasIpdChargeRepository ipdChargeRepository;
	private final SaasStaffRepository staffRepository;

	private final TenantAccessService tenantAccessService;
	private final SaasNotificationService notificationService;
	private final SaasPermissionService permissionService;

	public SaasBillingService(SaasInvoiceRepository invoiceRepository, SaasInvoiceItemRepository itemRepository,
			SaasPaymentReceiptRepository receiptRepository, SaasPatientRepository patientRepository,
			SaasOpdVisitRepository opdRepository, SaasIpdAdmissionRepository admissionRepository,
			SaasIpdChargeRepository ipdChargeRepository, TenantAccessService tenantAccessService,
			SaasNotificationService notificationService, SaasPermissionService permissionService,
			SaasStaffRepository staffRepository) {

		this.invoiceRepository = invoiceRepository;
		this.itemRepository = itemRepository;
		this.receiptRepository = receiptRepository;
		this.patientRepository = patientRepository;
		this.opdRepository = opdRepository;
		this.admissionRepository = admissionRepository;
		this.ipdChargeRepository = ipdChargeRepository;
		this.tenantAccessService = tenantAccessService;
		this.notificationService = notificationService;
		this.permissionService = permissionService;
		this.staffRepository = staffRepository;
	}

	/*
	 * ================================================================ CREATE
	 * INVOICE ================================================================
	 */

	@Transactional
	public SaasInvoiceResponse createInvoice(SaasInvoiceRequest request) {

		validateInvoiceRequest(request);

		requireBillingPermission(request.getTenantId(), SaasPermissionAction.CREATE);

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		SaasStaff doctor = null;

		if (request.getDoctorProfileId() != null) {

			doctor = getDoctor(request.getTenantId(), request.getDoctorProfileId());
		}

		SaasInvoiceType invoiceType = parseInvoiceType(request.getInvoiceType());

		/*
		 * ============================================================ OPD LINK
		 * VALIDATION ============================================================
		 */

		if (request.getOpdVisitId() != null) {

			SaasOpdVisit opd = opdRepository
					.findByIdAndTenantIdAndActiveTrue(request.getOpdVisitId(), request.getTenantId())
					.orElseThrow(() -> new RuntimeException("OPD visit not found."));

			if (!patient.getId().equals(opd.getPatientId())) {

				throw new RuntimeException("Selected patient does not match OPD visit.");
			}

			if (doctor != null && opd.getDoctorProfileId() != null
					&& !doctor.getId().equals(opd.getDoctorProfileId())) {

				throw new RuntimeException("Selected doctor does not match OPD visit.");
			}
		}

		/*
		 * ============================================================ IPD LINK
		 * VALIDATION ============================================================
		 */

		if (invoiceType == SaasInvoiceType.IPD && request.getIpdAdmissionId() == null) {

			throw new RuntimeException("IPD admission is required for an IPD invoice.");
		}

		if (request.getIpdAdmissionId() != null) {

			SaasIpdAdmission admission = admissionRepository
					.findByIdAndTenantIdAndActiveTrue(request.getIpdAdmissionId(), request.getTenantId())
					.orElseThrow(() -> new RuntimeException("IPD admission not found."));

			if (!patient.getId().equals(admission.getPatientId())) {

				throw new RuntimeException("Selected patient does not match IPD admission.");
			}

			if (doctor != null && admission.getDoctorProfileId() != null
					&& !doctor.getId().equals(admission.getDoctorProfileId())) {

				throw new RuntimeException("Selected doctor does not match IPD admission.");
			}

			/*
			 * Final IPD billing begins only after clinical discharge.
			 *
			 * Charges are frozen by IPD lifecycle after discharge.
			 */

			if (invoiceType == SaasInvoiceType.IPD && admission.getStatus() != SaasIpdStatus.DISCHARGED) {

				throw new RuntimeException("Final IPD invoice can be generated only after patient discharge.");
			}

			if (invoiceType == SaasInvoiceType.IPD
					&& invoiceRepository.existsByTenantIdAndIpdAdmissionIdAndInvoiceTypeAndActiveTrue(
							request.getTenantId(), admission.getId(), SaasInvoiceType.IPD)) {

				throw new RuntimeException("Final IPD invoice already exists for this admission.");
			}
		}

		BigDecimal subtotal = calculateSubtotal(request.getItems());

		BigDecimal discount = money(request.getDiscountAmount());

		BigDecimal tax = money(request.getTaxAmount());

		if (discount.signum() < 0 || tax.signum() < 0) {

			throw new RuntimeException("Discount and tax amounts cannot be negative.");
		}

		if (discount.compareTo(subtotal) > 0) {

			throw new RuntimeException("Discount cannot exceed invoice subtotal.");
		}

		BigDecimal total = subtotal.subtract(discount).add(tax);

		BigDecimal paid = money(request.getPaidAmount());

		if (paid.signum() < 0) {

			throw new RuntimeException("Paid amount cannot be negative.");
		}

		if (paid.compareTo(total) > 0) {

			throw new RuntimeException("Paid amount cannot exceed invoice total.");
		}

		SaasPaymentMode paymentMode = null;

		if (request.getPaymentMode() != null && !request.getPaymentMode().isBlank()) {

			paymentMode = parsePaymentMode(request.getPaymentMode());
		}

		if (paid.signum() > 0 && paymentMode == null) {

			throw new RuntimeException("Payment mode is required when paid amount is greater than zero.");
		}

		BigDecimal due = total.subtract(paid);

		SaasInvoice invoice = new SaasInvoice();

		invoice.setTenantId(request.getTenantId());

		invoice.setPatientId(patient.getId());

		invoice.setDoctorProfileId(doctor == null ? null : doctor.getId());

		invoice.setOpdVisitId(request.getOpdVisitId());

		invoice.setIpdAdmissionId(request.getIpdAdmissionId());

		invoice.setInvoiceType(invoiceType);

		invoice.setSubtotal(subtotal);

		invoice.setDiscountAmount(discount);

		invoice.setTaxAmount(tax);

		invoice.setTotalAmount(total);

		invoice.setPaidAmount(paid);

		invoice.setDueAmount(due);

		invoice.setPaymentStatus(derivePaymentStatus(total, paid));

		invoice.setPaymentMode(paymentMode);

		invoice.setTransactionId(trimToNull(request.getTransactionId()));

		invoice.setNotes(trimToNull(request.getNotes()));

		invoice.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		invoice.setActive(true);

		if (paid.signum() > 0) {

			invoice.setPaymentDateTime(LocalDateTime.now());
		}

		SaasInvoice saved = invoiceRepository.saveAndFlush(invoice);

		saved.setInvoiceNumber(generateInvoiceNumber(saved));

		saved = invoiceRepository.save(saved);

		saveItems(saved.getTenantId(), saved.getId(), request.getItems());

		/*
		 * Initial receipt.
		 *
		 * For final IPD invoice this may represent the advance amount being applied
		 * against the final bill.
		 */

		if (paid.signum() > 0 && paymentMode != null) {

			String remarks = invoiceType == SaasInvoiceType.IPD ? "IPD advance applied to final invoice"
					: "Payment received while creating invoice";

			createReceipt(saved, paid, paymentMode, request.getTransactionId(), remarks);
		}

		createBillingNotification(saved);

		return toResponse(saved);
	}

	/*
	 * ================================================================ INVOICE LIST
	 * / READ ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasInvoiceResponse> getInvoices(Long tenantId) {

		requireBillingPermission(tenantId, SaasPermissionAction.VIEW);

		return invoiceRepository.findByTenantIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasInvoiceResponse getInvoice(Long tenantId, Long invoiceId) {

		requireBillingPermission(tenantId, SaasPermissionAction.VIEW);

		return toResponse(getInvoiceEntity(tenantId, invoiceId));
	}

	@Transactional(readOnly = true)
	public List<SaasInvoiceResponse> getPatientInvoices(Long tenantId, Long patientId) {

		requireBillingPermission(tenantId, SaasPermissionAction.VIEW);

		patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		return invoiceRepository.findByTenantIdAndPatientIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId, patientId)
				.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasInvoiceResponse> getIpdInvoices(Long tenantId, Long admissionId) {

		requireBillingPermission(tenantId, SaasPermissionAction.VIEW);

		admissionRepository.findByIdAndTenantIdAndActiveTrue(admissionId, tenantId)
				.orElseThrow(() -> new RuntimeException("IPD admission not found."));

		return invoiceRepository
				.findByTenantIdAndIpdAdmissionIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId, admissionId).stream()
				.map(this::toResponse).toList();
	}

	/*
	 * ================================================================ FINAL IPD
	 * INVOICE ================================================================
	 */

	@Transactional
	public SaasInvoiceResponse createIpdFinalInvoice(Long tenantId, Long admissionId) {

		requireBillingPermission(tenantId, SaasPermissionAction.CREATE);

		SaasIpdAdmission admission = admissionRepository.findByIdAndTenantIdAndActiveTrue(admissionId, tenantId)
				.orElseThrow(() -> new RuntimeException("IPD admission not found."));

		if (admission.getStatus() != SaasIpdStatus.DISCHARGED) {

			throw new RuntimeException("Discharge the patient before generating the final IPD invoice.");
		}

		if (invoiceRepository.existsByTenantIdAndIpdAdmissionIdAndInvoiceTypeAndActiveTrue(tenantId, admissionId,
				SaasInvoiceType.IPD)) {

			throw new RuntimeException("Final IPD invoice already exists for this admission.");
		}

		List<SaasIpdCharge> charges = ipdChargeRepository
				.findByTenantIdAndAdmissionIdOrderByChargeDateTimeDesc(tenantId, admissionId);

		if (charges == null || charges.isEmpty()) {

			throw new RuntimeException("No IPD charges found for this admission.");
		}

		List<SaasInvoiceItemRequest> items = charges.stream().map(charge -> {

			SaasInvoiceItemRequest item = new SaasInvoiceItemRequest();

			item.setItemName(charge.getDescription());

			item.setItemType(charge.getChargeType().name());

			item.setQuantity(1);

			item.setUnitPrice(money(charge.getAmount()));

			return item;
		}).toList();

		BigDecimal chargeTotal = calculateSubtotal(items);

		BigDecimal advance = money(admission.getAdvanceAmount());

		if (advance.compareTo(chargeTotal) > 0) {

			throw new RuntimeException("IPD advance exceeds final charge total. "
					+ "Adjust or refund the excess advance before generating the final invoice.");
		}

		SaasInvoiceRequest request = new SaasInvoiceRequest();

		request.setTenantId(tenantId);

		request.setPatientId(admission.getPatientId());

		request.setDoctorProfileId(admission.getDoctorProfileId());

		request.setIpdAdmissionId(admission.getId());

		request.setInvoiceType(SaasInvoiceType.IPD.name());

		request.setDiscountAmount(BigDecimal.ZERO);

		request.setTaxAmount(BigDecimal.ZERO);

		request.setPaidAmount(advance);

		if (advance.signum() > 0) {

			/*
			 * Advance mode is not currently stored on the admission. OTHER avoids falsely
			 * claiming CASH/UPI/etc.
			 */

			request.setPaymentMode(SaasPaymentMode.OTHER.name());
		}

		request.setNotes("Final IPD invoice generated from frozen admission charge ledger.");

		request.setItems(items);

		return createInvoice(request);
	}

	/*
	 * ================================================================ RECORD
	 * PAYMENT ================================================================
	 *
	 * paidAmount parameter means:
	 *
	 * AMOUNT RECEIVED IN THIS TRANSACTION
	 *
	 * It is NOT cumulative invoice paid amount.
	 *
	 * paymentStatus is retained only for API backward compatibility. Server derives
	 * the status from financial totals.
	 */

	@Transactional
	public SaasInvoiceResponse updatePayment(Long tenantId, Long invoiceId, String paymentStatus, String paymentMode,
			BigDecimal paidAmount, String transactionId) {

		requireBillingPermission(tenantId, SaasPermissionAction.UPDATE);

		SaasInvoice invoice = getInvoiceEntity(tenantId, invoiceId);

		BigDecimal received = money(paidAmount);

		if (received.signum() <= 0) {

			throw new RuntimeException("Received payment amount must be greater than zero.");
		}

		BigDecimal currentPaid = money(invoice.getPaidAmount());

		BigDecimal total = money(invoice.getTotalAmount());

		BigDecimal currentDue = total.subtract(currentPaid);

		if (currentDue.signum() <= 0) {

			throw new RuntimeException("Invoice is already fully paid.");
		}

		if (received.compareTo(currentDue) > 0) {

			throw new RuntimeException("Received amount cannot exceed current due amount ₹" + currentDue + ".");
		}

		SaasPaymentMode mode = parsePaymentMode(paymentMode);

		BigDecimal newPaid = currentPaid.add(received);

		BigDecimal newDue = total.subtract(newPaid);

		invoice.setPaidAmount(newPaid);

		invoice.setDueAmount(newDue);

		invoice.setPaymentStatus(derivePaymentStatus(total, newPaid));

		invoice.setPaymentMode(mode);

		invoice.setTransactionId(trimToNull(transactionId));

		invoice.setPaymentDateTime(LocalDateTime.now());

		invoice.touch();

		SaasInvoice saved = invoiceRepository.save(invoice);

		/*
		 * Receipt contains ONLY this transaction amount.
		 */

		createReceipt(saved, received, mode, transactionId, "Invoice payment received");

		createBillingNotification(saved);

		return toResponse(saved);
	}

	/*
	 * ================================================================ RECEIPTS
	 * ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasPaymentReceiptResponse> getReceipts(Long tenantId, Long invoiceId) {

		requireBillingPermission(tenantId, SaasPermissionAction.VIEW);

		getInvoiceEntity(tenantId, invoiceId);

		return receiptRepository.findByTenantIdAndInvoiceIdOrderByReceiptDateTimeDesc(tenantId, invoiceId).stream()
				.map(this::toReceiptResponse).toList();
	}

	/*
	 * ================================================================ VALIDATION
	 * ================================================================
	 */

	private void validateInvoiceRequest(SaasInvoiceRequest request) {

		if (request == null) {

			throw new RuntimeException("Invoice request is required.");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required.");
		}

		if (request.getPatientId() == null) {

			throw new RuntimeException("patientId is required.");
		}

		if (request.getInvoiceType() == null || request.getInvoiceType().isBlank()) {

			throw new RuntimeException("invoiceType is required.");
		}

		parseInvoiceType(request.getInvoiceType());

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("Invoice items are required.");
		}

		boolean validItemFound = false;

		for (SaasInvoiceItemRequest item : request.getItems()) {

			if (item == null || item.getItemName() == null || item.getItemName().isBlank()) {

				continue;
			}

			validItemFound = true;

			if (item.getQuantity() != null && item.getQuantity() <= 0) {

				throw new RuntimeException("Invoice item quantity must be greater than zero.");
			}

			if (item.getUnitPrice() != null && item.getUnitPrice().signum() < 0) {

				throw new RuntimeException("Invoice item price cannot be negative.");
			}
		}

		if (!validItemFound) {

			throw new RuntimeException("At least one valid invoice item is required.");
		}
	}

	private void requireBillingPermission(Long tenantId, SaasPermissionAction action) {

		if (tenantId == null) {

			throw new RuntimeException("tenantId is required.");
		}

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.BILLING, action);
	}

	private SaasInvoice getInvoiceEntity(Long tenantId, Long invoiceId) {

		return invoiceRepository.findByIdAndTenantIdAndActiveTrue(invoiceId, tenantId)
				.orElseThrow(() -> new RuntimeException("Invoice not found."));
	}

	private SaasStaff getDoctor(Long tenantId, Long doctorStaffId) {

		SaasStaff doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Doctor not found."));

		if (doctor.getStaffRole() != SaasStaffRole.DOCTOR) {

			throw new RuntimeException("Selected staff member is not a doctor.");
		}

		return doctor;
	}

	/*
	 * ================================================================ CALCULATION
	 * ================================================================
	 */

	private BigDecimal calculateSubtotal(List<SaasInvoiceItemRequest> items) {

		BigDecimal subtotal = BigDecimal.ZERO;

		if (items == null) {

			return subtotal;
		}

		for (SaasInvoiceItemRequest item : items) {

			if (item == null || item.getItemName() == null || item.getItemName().isBlank()) {

				continue;
			}

			int quantity = item.getQuantity() == null ? 1 : item.getQuantity();

			BigDecimal unitPrice = money(item.getUnitPrice());

			subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(quantity)));
		}

		return subtotal;
	}

	private void saveItems(Long tenantId, Long invoiceId, List<SaasInvoiceItemRequest> items) {

		for (SaasInvoiceItemRequest item : items) {

			if (item == null || item.getItemName() == null || item.getItemName().isBlank()) {

				continue;
			}

			int quantity = item.getQuantity() == null ? 1 : item.getQuantity();

			BigDecimal unitPrice = money(item.getUnitPrice());

			SaasInvoiceItem invoiceItem = new SaasInvoiceItem();

			invoiceItem.setTenantId(tenantId);

			invoiceItem.setInvoiceId(invoiceId);

			invoiceItem.setItemName(item.getItemName().trim());

			invoiceItem.setItemType(trimToNull(item.getItemType()));

			invoiceItem.setQuantity(quantity);

			invoiceItem.setUnitPrice(unitPrice);

			invoiceItem.setTotalPrice(unitPrice.multiply(BigDecimal.valueOf(quantity)));

			itemRepository.save(invoiceItem);
		}
	}

	private SaasPaymentStatus derivePaymentStatus(BigDecimal total, BigDecimal paid) {

		if (paid == null || paid.signum() <= 0) {

			return SaasPaymentStatus.UNPAID;
		}

		if (paid.compareTo(total) < 0) {

			return SaasPaymentStatus.PARTIAL;
		}

		return SaasPaymentStatus.PAID;
	}

	private BigDecimal money(BigDecimal value) {

		return value == null ? BigDecimal.ZERO : value;
	}

	/*
	 * ================================================================ RECEIPT
	 * ================================================================
	 */

	private void createReceipt(SaasInvoice invoice, BigDecimal paidAmount, SaasPaymentMode paymentMode,
			String transactionId, String remarks) {

		SaasPaymentReceipt receipt = new SaasPaymentReceipt();

		receipt.setTenantId(invoice.getTenantId());

		receipt.setInvoiceId(invoice.getId());

		receipt.setPaidAmount(paidAmount);

		receipt.setPaymentMode(paymentMode);

		receipt.setTransactionId(trimToNull(transactionId));

		receipt.setRemarks(trimToNull(remarks));

		receipt.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasPaymentReceipt saved = receiptRepository.saveAndFlush(receipt);

		saved.setReceiptNumber("RCT-" + saved.getTenantId() + "-" + String.format("%05d", saved.getId()));

		receiptRepository.save(saved);
	}

	/*
	 * ================================================================ NOTIFICATION
	 * ================================================================
	 */

	private void createBillingNotification(SaasInvoice invoice) {

		if (invoice.getDueAmount() != null && invoice.getDueAmount().signum() > 0) {

			notificationService.createSystemNotificationIfNotExists(

					invoice.getTenantId(),

					SaasNotificationType.BILLING,

					SaasNotificationPriority.HIGH,

					"Payment due",

					"Invoice " + invoice.getInvoiceNumber() + " has due amount ₹" + invoice.getDueAmount(),

					invoice.getId(),

					"INVOICE",

					"/saas/billing");

			return;
		}

		if (invoice.getPaymentStatus() == SaasPaymentStatus.PAID) {

			notificationService.createSystemNotificationIfNotExists(

					invoice.getTenantId(),

					SaasNotificationType.BILLING,

					SaasNotificationPriority.MEDIUM,

					"Payment received",

					"Invoice " + invoice.getInvoiceNumber() + " payment completed.",

					invoice.getId(),

					"INVOICE",

					"/saas/billing");
		}
	}

	/*
	 * ================================================================ PARSERS
	 * ================================================================
	 */

	private SaasInvoiceType parseInvoiceType(String value) {

		try {

			return SaasInvoiceType.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (Exception exception) {

			throw new RuntimeException("Invalid invoiceType: " + value);
		}
	}

	private SaasPaymentMode parsePaymentMode(String value) {

		if (value == null || value.isBlank()) {

			throw new RuntimeException("Payment mode is required.");
		}

		try {

			return SaasPaymentMode.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (Exception exception) {

			throw new RuntimeException("Invalid payment mode: " + value);
		}
	}

	/*
	 * ================================================================ RESPONSE
	 * ================================================================
	 */

	private SaasInvoiceResponse toResponse(SaasInvoice invoice) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(invoice.getPatientId(), invoice.getTenantId()).orElse(null);

		SaasStaff doctor = null;

		if (invoice.getDoctorProfileId() != null) {

			doctor = staffRepository
					.findByIdAndTenantIdAndActiveTrue(invoice.getDoctorProfileId(), invoice.getTenantId())
					.filter(staff -> staff.getStaffRole() == SaasStaffRole.DOCTOR).orElse(null);
		}

		SaasIpdAdmission admission = null;

		if (invoice.getIpdAdmissionId() != null) {

			admission = admissionRepository
					.findByIdAndTenantIdAndActiveTrue(invoice.getIpdAdmissionId(), invoice.getTenantId()).orElse(null);
		}

		List<SaasInvoiceItemResponse> items = itemRepository
				.findByTenantIdAndInvoiceIdOrderByIdAsc(invoice.getTenantId(), invoice.getId()).stream()
				.map(item -> new SaasInvoiceItemResponse(

						item.getId(),

						item.getItemName(),

						item.getItemType(),

						item.getQuantity(),

						item.getUnitPrice(),

						item.getTotalPrice()))
				.toList();

		return new SaasInvoiceResponse(

				invoice.getId(),

				invoice.getTenantId(),

				invoice.getInvoiceNumber(),

				invoice.getInvoiceType().name(),

				invoice.getPatientId(),

				patient == null ? null : patient.getPatientName(),

				patient == null ? null : patient.getMobile(),

				invoice.getDoctorProfileId(),

				doctor == null ? null : doctor.getStaffName(),

				doctor == null ? null : doctor.getDepartment(),

				invoice.getOpdVisitId(),

				invoice.getIpdAdmissionId(),

				admission == null ? null : admission.getIpdNumber(),

				invoice.getSubtotal(),

				invoice.getDiscountAmount(),

				invoice.getTaxAmount(),

				invoice.getTotalAmount(),

				invoice.getPaidAmount(),

				invoice.getDueAmount(),

				invoice.getPaymentStatus().name(),

				invoice.getPaymentMode() == null ? null : invoice.getPaymentMode().name(),

				invoice.getTransactionId(),

				invoice.getNotes(),

				invoice.getInvoiceDateTime(),

				invoice.getPaymentDateTime(),

				items);
	}

	private SaasPaymentReceiptResponse toReceiptResponse(SaasPaymentReceipt receipt) {

		return new SaasPaymentReceiptResponse(

				receipt.getId(),

				receipt.getTenantId(),

				receipt.getInvoiceId(),

				receipt.getReceiptNumber(),

				receipt.getPaidAmount(),

				receipt.getPaymentMode() == null ? null : receipt.getPaymentMode().name(),

				receipt.getTransactionId(),

				receipt.getRemarks(),

				receipt.getReceiptDateTime());
	}

	private String generateInvoiceNumber(SaasInvoice invoice) {

		return "INV-" + invoice.getTenantId() + "-" + String.format("%05d", invoice.getId());
	}

	private String trimToNull(String value) {

		if (value == null) {

			return null;
		}

		String trimmed = value.trim();

		return trimmed.isBlank() ? null : trimmed;
	}
}