package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.*;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SaasPharmacyService {

	private final SaasPharmacySaleRepository saleRepository;
	private final SaasPharmacySaleItemRepository saleItemRepository;
	private final SaasMedicineStockRepository stockRepository;
	private final SaasPatientRepository patientRepository;

	private final SaasPrescriptionRepository prescriptionRepository;
	private final SaasPrescriptionMedicineRepository prescriptionMedicineRepository;

	private final SaasStaffRepository staffRepository;

	private final SaasBillingService billingService;
	private final SaasInventoryService inventoryService;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasPatientSelfResolverService patientSelfResolverService;

	public SaasPharmacyService(SaasPharmacySaleRepository saleRepository,
			SaasPharmacySaleItemRepository saleItemRepository, SaasMedicineStockRepository stockRepository,
			SaasPatientRepository patientRepository, SaasPrescriptionRepository prescriptionRepository,
			SaasPrescriptionMedicineRepository prescriptionMedicineRepository, SaasStaffRepository staffRepository,
			SaasBillingService billingService, SaasInventoryService inventoryService,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			SaasPatientSelfResolverService patientSelfResolverService) {

		this.saleRepository = saleRepository;

		this.saleItemRepository = saleItemRepository;

		this.stockRepository = stockRepository;

		this.patientRepository = patientRepository;

		this.prescriptionRepository = prescriptionRepository;

		this.prescriptionMedicineRepository = prescriptionMedicineRepository;

		this.staffRepository = staffRepository;

		this.billingService = billingService;

		this.inventoryService = inventoryService;

		this.tenantAccessService = tenantAccessService;

		this.permissionService = permissionService;

		this.patientSelfResolverService = patientSelfResolverService;
	}

	/*
	 * ================================================================ CREATE /
	 * DISPENSE SALE
	 * ================================================================
	 */

	@Transactional
	public SaasPharmacySaleResponse createSale(String authorization, SaasPharmacySaleRequest request) {

		validateSaleRequest(request);

		requirePermission(request.getTenantId(), SaasPermissionAction.CREATE);

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		/*
		 * ------------------------------------------------------------ OPTIONAL
		 * PRESCRIPTION LINK
		 * ------------------------------------------------------------
		 */

		SaasPrescription prescription = null;

		if (request.getPrescriptionId() != null) {

			prescription = prescriptionRepository
					.findByIdAndTenantIdAndActiveTrue(request.getPrescriptionId(), request.getTenantId())
					.orElseThrow(() -> new RuntimeException("Prescription not found."));

			if (!patient.getId().equals(prescription.getPatientId())) {

				throw new RuntimeException("Selected prescription does not belong to selected patient.");
			}

			/*
			 * One completed pharmacy fulfilment per prescription.
			 *
			 * Current prescription model has no partial-dispense quantities, therefore
			 * duplicate fulfilment is blocked rather than guessing remaining prescribed
			 * quantities.
			 */

			if (saleRepository.existsByTenantIdAndPrescriptionIdAndActiveTrue(request.getTenantId(),
					prescription.getId())) {

				throw new RuntimeException("This prescription has already been fulfilled by pharmacy.");
			}
		}

		/*
		 * ------------------------------------------------------------ LOCK + VALIDATE
		 * ALL STOCK FIRST ------------------------------------------------------------
		 */

		List<PreparedSaleLine> preparedLines = prepareSaleLines(request);

		BigDecimal subtotal = preparedLines.stream().map(PreparedSaleLine::lineTotal).reduce(BigDecimal.ZERO,
				BigDecimal::add);

		BigDecimal discount = money(request.getDiscountAmount());

		BigDecimal tax = money(request.getTaxAmount());

		BigDecimal paid = money(request.getPaidAmount());

		if (discount.signum() < 0 || tax.signum() < 0 || paid.signum() < 0) {

			throw new RuntimeException("Discount, tax and paid amount cannot be negative.");
		}

		if (discount.compareTo(subtotal) > 0) {

			throw new RuntimeException("Discount cannot exceed pharmacy subtotal.");
		}

		BigDecimal total = subtotal.subtract(discount).add(tax);

		if (paid.compareTo(total) > 0) {

			throw new RuntimeException("Paid amount cannot exceed pharmacy sale total.");
		}

		SaasPaymentMode paymentMode = null;

		if (request.getPaymentMode() != null && !request.getPaymentMode().isBlank()) {

			paymentMode = parsePaymentMode(request.getPaymentMode());
		}

		if (paid.signum() > 0 && paymentMode == null) {

			throw new RuntimeException("Payment mode is required when paid amount is greater than zero.");
		}

		BigDecimal due = total.subtract(paid);

		/*
		 * ------------------------------------------------------------ SALE HEADER
		 * ------------------------------------------------------------
		 */

		SaasPharmacySale sale = new SaasPharmacySale();

		sale.setTenantId(request.getTenantId());

		sale.setPatientId(patient.getId());

		sale.setPrescriptionId(prescription == null ? null : prescription.getId());

		sale.setSubtotal(subtotal);

		sale.setDiscountAmount(discount);

		sale.setTaxAmount(tax);

		sale.setTotalAmount(total);

		sale.setPaidAmount(paid);

		sale.setDueAmount(due);

		sale.setPaymentStatus(derivePaymentStatus(total, paid));

		sale.setPaymentMode(paymentMode);

		sale.setStatus(SaasPharmacySaleStatus.COMPLETED);

		sale.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		sale.setActive(true);

		SaasPharmacySale savedSale = saleRepository.saveAndFlush(sale);

		savedSale.setSaleNumber(generateSaleNumber(savedSale));

		savedSale = saleRepository.save(savedSale);

		/*
		 * ------------------------------------------------------------ DISPENSE + STOCK
		 * MOVEMENTS ------------------------------------------------------------
		 */

		saveSaleItemsAndReduceStock(savedSale, preparedLines);

		/*
		 * ------------------------------------------------------------ CONSOLIDATED
		 * BILLING ------------------------------------------------------------
		 */

		SaasInvoiceResponse invoice = createPharmacyInvoice(savedSale);

		savedSale.setInvoiceId(invoice.getId());

		savedSale.touch();

		savedSale = saleRepository.save(savedSale);

		return toResponse(savedSale);
	}

	/*
	 * ================================================================ PREPARE
	 * LOCKED STOCK LINES
	 * ================================================================
	 */

	private List<PreparedSaleLine> prepareSaleLines(SaasPharmacySaleRequest request) {

		List<PreparedSaleLine> result = new ArrayList<>();

		Set<Long> usedStockIds = new HashSet<>();

		LocalDate today = LocalDate.now();

		for (SaasPharmacySaleItemRequest item : request.getItems()) {

			if (item == null || item.getMedicineId() == null || item.getStockId() == null) {

				throw new RuntimeException("Medicine and stock batch are required.");
			}

			if (!usedStockIds.add(item.getStockId())) {

				throw new RuntimeException("Same stock batch cannot be added more than once.");
			}

			int quantity = item.getQuantity() == null ? 0 : item.getQuantity();

			if (quantity <= 0) {

				throw new RuntimeException("Sale quantity must be greater than zero.");
			}

			/*
			 * PESSIMISTIC_WRITE protects stock from concurrent sales.
			 */

			SaasMedicineStock stock = stockRepository.findStockForUpdate(item.getStockId(), request.getTenantId())
					.orElseThrow(() -> new RuntimeException("Selected stock batch not found."));

			if (!item.getMedicineId().equals(stock.getMedicineId())) {

				throw new RuntimeException("Selected medicine does not match selected stock batch.");
			}

			if (!Boolean.TRUE.equals(stock.getActive())) {

				throw new RuntimeException("Selected stock batch is inactive.");
			}

			/*
			 * SaasMedicineStock treats expiry date <= today as non-saleable.
			 */

			if (stock.getExpiryDate() != null && !stock.getExpiryDate().isAfter(today)) {

				throw new RuntimeException("Expired or expiring-today batch cannot be dispensed: " + safeBatch(stock));
			}

			if (Boolean.TRUE.equals(stock.getExpiryQuarantined()) && stock.getSaleableQuantity() <= 0) {

				throw new RuntimeException(
						"Selected batch is quarantined and has no saleable quantity: " + safeBatch(stock));
			}

			int saleable = stock.getSaleableQuantity();

			if (saleable < quantity) {

				throw new RuntimeException("Insufficient saleable stock for " + safeMedicineName(stock) + " batch "
						+ safeBatch(stock) + ". Available: " + saleable);
			}

			BigDecimal unitPrice = money(stock.getSalePrice());

			if (unitPrice.signum() < 0) {

				throw new RuntimeException("Medicine sale price cannot be negative.");
			}

			BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));

			result.add(new PreparedSaleLine(stock, quantity, unitPrice, lineTotal));
		}

		return result;
	}

	/*
	 * ================================================================ SAVE ITEMS +
	 * STOCK REDUCTION
	 * ================================================================
	 */

	private void saveSaleItemsAndReduceStock(SaasPharmacySale sale, List<PreparedSaleLine> lines) {

		for (PreparedSaleLine line : lines) {

			SaasMedicineStock stock = line.stock();

			SaasPharmacySaleItem saleItem = new SaasPharmacySaleItem();

			saleItem.setTenantId(sale.getTenantId());

			saleItem.setSaleId(sale.getId());

			saleItem.setMedicineId(stock.getMedicineId());

			saleItem.setStockId(stock.getId());

			saleItem.setMedicineName(safeMedicineName(stock));

			saleItem.setBatchNumber(stock.getBatchNumber());

			saleItem.setQuantity(line.quantity());

			saleItem.setSalePrice(line.unitPrice());

			saleItem.setTotalPrice(line.lineTotal());

			saleItemRepository.save(saleItem);

			/*
			 * Existing entity method correctly respects quarantined stock.
			 */

			stock.decreaseCurrentQuantity(line.quantity());

			stockRepository.save(stock);

			inventoryService.createMovement(

					sale.getTenantId(),

					stock.getMedicineId(),

					stock.getId(),

					SaasStockMovementType.SALE,

					line.quantity(),

					sale.getPrescriptionId() == null ? "Pharmacy medicine sale" : "Prescription pharmacy fulfilment",

					sale.getId());
		}
	}

	/*
	 * ================================================================ INVOICE
	 * ================================================================
	 */

	private SaasInvoiceResponse createPharmacyInvoice(SaasPharmacySale sale) {

		List<SaasInvoiceItemRequest> invoiceItems = saleItemRepository
				.findByTenantIdAndSaleIdOrderByIdAsc(sale.getTenantId(), sale.getId()).stream().map(item -> {

					SaasInvoiceItemRequest invoiceItem = new SaasInvoiceItemRequest();

					invoiceItem.setItemName(item.getMedicineName() + " - Batch " + item.getBatchNumber());

					invoiceItem.setItemType(SaasInvoiceType.PHARMACY.name());

					invoiceItem.setQuantity(item.getQuantity());

					invoiceItem.setUnitPrice(item.getSalePrice());

					return invoiceItem;
				}).toList();

		SaasInvoiceRequest invoiceRequest = new SaasInvoiceRequest();

		invoiceRequest.setTenantId(sale.getTenantId());

		invoiceRequest.setPatientId(sale.getPatientId());

		invoiceRequest.setInvoiceType(SaasInvoiceType.PHARMACY.name());

		invoiceRequest.setDiscountAmount(sale.getDiscountAmount());

		invoiceRequest.setTaxAmount(sale.getTaxAmount());

		invoiceRequest.setPaidAmount(sale.getPaidAmount());

		invoiceRequest.setPaymentMode(sale.getPaymentMode() == null ? null : sale.getPaymentMode().name());

		invoiceRequest.setNotes(sale.getPrescriptionId() == null ? "Pharmacy sale invoice: " + sale.getSaleNumber()
				: "Prescription pharmacy fulfilment: RX-" + sale.getPrescriptionId() + " / " + sale.getSaleNumber());

		invoiceRequest.setItems(invoiceItems);

		return billingService.createInvoice(invoiceRequest);
	}

	/*
	 * ================================================================ DISPENSABLE
	 * PRESCRIPTIONS
	 * ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasPharmacyPrescriptionOptionResponse> getDispensablePrescriptions(Long tenantId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return prescriptionRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream()
				.filter(prescription -> !saleRepository.existsByTenantIdAndPrescriptionIdAndActiveTrue(tenantId,
						prescription.getId()))
				.map(this::toPrescriptionOption).toList();
	}

	private SaasPharmacyPrescriptionOptionResponse toPrescriptionOption(SaasPrescription prescription) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(prescription.getPatientId(), prescription.getTenantId()).orElse(null);

		SaasStaff doctor = staffRepository
				.findByIdAndTenantIdAndActiveTrue(prescription.getDoctorProfileId(), prescription.getTenantId())
				.orElse(null);

		List<String> medicineNames = prescriptionMedicineRepository
				.findByTenantIdAndPrescriptionIdOrderByIdAsc(prescription.getTenantId(), prescription.getId()).stream()
				.map(SaasPrescriptionMedicine::getMedicineName).filter(Objects::nonNull).map(String::trim)
				.filter(value -> !value.isBlank()).toList();

		return new SaasPharmacyPrescriptionOptionResponse(

				prescription.getId(),

				prescription.getPatientId(),

				patient == null ? null : patient.getPatientName(),

				patient == null ? null : patient.getMobile(),

				doctor == null ? null : doctor.getStaffName(),

				prescription.getDiagnosis(),

				prescription.getCreatedAt(),

				medicineNames);
	}

	/*
	 * ================================================================ STAFF READ
	 * ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasPharmacySaleResponse> getSales(Long tenantId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return saleRepository.findByTenantIdAndActiveTrueOrderBySaleDateTimeDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasPharmacySaleResponse> getPatientSales(Long tenantId, Long patientId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		return saleRepository.findByTenantIdAndPatientIdAndActiveTrueOrderBySaleDateTimeDesc(tenantId, patientId)
				.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasPharmacySaleResponse getSale(Long tenantId, Long saleId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return toResponse(getSaleEntity(tenantId, saleId));
	}

	/*
	 * ================================================================ PATIENT SELF
	 * HISTORY ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasPharmacySaleResponse> getMySales(Long tenantId) {

		requirePatientRole();

		tenantAccessService.validateTenantAccess(tenantId);

		SaasPatient patient = patientSelfResolverService.resolvePatientEntity(tenantId);

		return saleRepository.findByTenantIdAndPatientIdAndActiveTrueOrderBySaleDateTimeDesc(tenantId, patient.getId())
				.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasPharmacySaleResponse getMySale(Long tenantId, Long saleId) {

		requirePatientRole();

		SaasPatient patient = patientSelfResolverService.resolvePatientEntity(tenantId);

		SaasPharmacySale sale = getSaleEntity(tenantId, saleId);

		if (!patient.getId().equals(sale.getPatientId())) {

			throw new AccessDeniedException("You cannot access another patient's pharmacy sale.");
		}

		return toResponse(sale);
	}

	/*
	 * ================================================================ VALIDATION
	 * ================================================================
	 */

	private void validateSaleRequest(SaasPharmacySaleRequest request) {

		if (request == null) {

			throw new RuntimeException("Pharmacy sale request is required.");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required.");
		}

		if (request.getPatientId() == null) {

			throw new RuntimeException("patientId is required.");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("Sale items are required.");
		}
	}

	private void requirePermission(Long tenantId, SaasPermissionAction action) {

		if (tenantId == null) {

			throw new RuntimeException("tenantId is required.");
		}

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PHARMACY, action);
	}

	private void requirePatientRole() {

		String role = CurrentUserUtil.getRole();

		if (role == null || !"PATIENT".equals(role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", ""))) {

			throw new AccessDeniedException("Patient access is required.");
		}
	}

	private SaasPharmacySale getSaleEntity(Long tenantId, Long saleId) {

		return saleRepository.findByIdAndTenantIdAndActiveTrue(saleId, tenantId)
				.orElseThrow(() -> new RuntimeException("Pharmacy sale not found."));
	}

	private SaasPaymentMode parsePaymentMode(String value) {

		try {

			return SaasPaymentMode.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (Exception exception) {

			throw new RuntimeException("Invalid payment mode: " + value);
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
	 * ================================================================ RESPONSE
	 * ================================================================
	 */

	private SaasPharmacySaleResponse toResponse(SaasPharmacySale sale) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(sale.getPatientId(), sale.getTenantId()).orElse(null);

		List<SaasPharmacySaleItemResponse> items = saleItemRepository
				.findByTenantIdAndSaleIdOrderByIdAsc(sale.getTenantId(), sale.getId()).stream()
				.map(item -> new SaasPharmacySaleItemResponse(

						item.getId(),

						item.getMedicineId(),

						item.getStockId(),

						item.getMedicineName(),

						item.getBatchNumber(),

						item.getQuantity(),

						item.getSalePrice(),

						item.getTotalPrice()))
				.toList();

		return new SaasPharmacySaleResponse(

				sale.getId(),

				sale.getTenantId(),

				sale.getSaleNumber(),

				sale.getPatientId(),

				patient == null ? null : patient.getPatientName(),

				patient == null ? null : patient.getMobile(),

				sale.getPrescriptionId(),

				sale.getInvoiceId(),

				sale.getSubtotal(),

				sale.getDiscountAmount(),

				sale.getTaxAmount(),

				sale.getTotalAmount(),

				sale.getPaidAmount(),

				sale.getDueAmount(),

				sale.getPaymentStatus().name(),

				sale.getPaymentMode() == null ? null : sale.getPaymentMode().name(),

				sale.getStatus().name(),

				sale.getSaleDateTime(),

				items);
	}

	private String generateSaleNumber(SaasPharmacySale sale) {

		return "SALE-" + sale.getTenantId() + "-" + String.format("%05d", sale.getId());
	}

	private String safeMedicineName(SaasMedicineStock stock) {

		if (stock.getMedicineName() == null || stock.getMedicineName().isBlank()) {

			return "Medicine #" + stock.getMedicineId();
		}

		return stock.getMedicineName().trim();
	}

	private String safeBatch(SaasMedicineStock stock) {

		return stock.getBatchNumber() == null ? "-" : stock.getBatchNumber().trim();
	}

	private record PreparedSaleLine(SaasMedicineStock stock, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
	}
}