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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class SaasDiagnosticService {

	private final SaasDiagnosticTestRepository testRepository;
	private final SaasDiagnosticOrderRepository orderRepository;
	private final SaasDiagnosticOrderItemRepository orderItemRepository;
	private final SaasPatientRepository patientRepository;
	private final SaasStaffRepository staffRepository;

	private final SaasBillingService billingService;
	private final TenantAccessService tenantAccessService;
	private final SaasNotificationService notificationService;
	private final SaasPermissionService permissionService;
	private final SaasPatientSelfResolverService patientSelfResolverService;

	public SaasDiagnosticService(SaasDiagnosticTestRepository testRepository,
			SaasDiagnosticOrderRepository orderRepository, SaasDiagnosticOrderItemRepository orderItemRepository,
			SaasPatientRepository patientRepository, SaasBillingService billingService,
			TenantAccessService tenantAccessService, SaasNotificationService notificationService,
			SaasPermissionService permissionService, SaasStaffRepository staffRepository,
			SaasPatientSelfResolverService patientSelfResolverService) {

		this.testRepository = testRepository;
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
		this.patientRepository = patientRepository;
		this.billingService = billingService;
		this.tenantAccessService = tenantAccessService;
		this.notificationService = notificationService;
		this.permissionService = permissionService;
		this.staffRepository = staffRepository;
		this.patientSelfResolverService = patientSelfResolverService;
	}

	/*
	 * ================================================================ TEST MASTER
	 * ================================================================
	 */

	@Transactional
	public SaasDiagnosticTestResponse createTest(SaasDiagnosticTestRequest request) {

		if (request == null) {
			throw new RuntimeException("Diagnostic test request is required.");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required.");
		}

		SaasDiagnosticType type = parseDiagnosticType(request.getDiagnosticType());

		requirePermission(request.getTenantId(), type, SaasPermissionAction.CREATE);

		if (request.getTestName() == null || request.getTestName().isBlank()) {

			throw new RuntimeException("Test name is required.");
		}

		String testName = request.getTestName().trim();

		if (testRepository.existsByTenantIdAndDiagnosticTypeAndTestNameIgnoreCaseAndActiveTrue(request.getTenantId(),
				type, testName)) {

			throw new RuntimeException("Diagnostic test with this name already exists.");
		}

		String testCode = trimToNull(request.getTestCode());

		if (testCode != null && testRepository.existsByTenantIdAndDiagnosticTypeAndTestCodeIgnoreCaseAndActiveTrue(
				request.getTenantId(), type, testCode)) {

			throw new RuntimeException("Diagnostic test code already exists.");
		}

		BigDecimal price = money(request.getPrice());

		if (price.signum() < 0) {

			throw new RuntimeException("Test price cannot be negative.");
		}

		SaasDiagnosticTest test = new SaasDiagnosticTest();

		test.setTenantId(request.getTenantId());

		test.setDiagnosticType(type);

		test.setTestName(testName);

		test.setTestCode(testCode);

		test.setCategory(trimToNull(request.getCategory()));

		test.setDescription(trimToNull(request.getDescription()));

		test.setPrice(price);

		test.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		test.setActive(true);

		return toTestResponse(testRepository.save(test));
	}

	@Transactional(readOnly = true)
	public List<SaasDiagnosticTestResponse> getTests(Long tenantId, String type) {

		SaasDiagnosticType diagnosticType = parseDiagnosticType(type);

		requirePermission(tenantId, diagnosticType, SaasPermissionAction.VIEW);

		return testRepository.findByTenantIdAndDiagnosticTypeAndActiveTrueOrderByTestNameAsc(tenantId, diagnosticType)
				.stream().map(this::toTestResponse).toList();
	}

	/*
	 * ================================================================ CREATE ORDER
	 * ================================================================
	 */

	@Transactional
	public SaasDiagnosticOrderResponse createOrder(SaasDiagnosticOrderRequest request) {

		validateOrderRequest(request);

		SaasDiagnosticType type = parseDiagnosticType(request.getDiagnosticType());

		requirePermission(request.getTenantId(), type, SaasPermissionAction.CREATE);

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		SaasStaff doctor = null;

		if (request.getDoctorProfileId() != null) {

			doctor = getDoctor(request.getTenantId(), request.getDoctorProfileId());

			validateDoctorOwnership(doctor);
		}

		BigDecimal subtotal = calculateSubtotal(request.getTenantId(), type, request.getItems());

		BigDecimal discount = money(request.getDiscountAmount());

		BigDecimal tax = money(request.getTaxAmount());

		if (discount.signum() < 0 || tax.signum() < 0) {

			throw new RuntimeException("Discount and tax cannot be negative.");
		}

		if (discount.compareTo(subtotal) > 0) {

			throw new RuntimeException("Discount cannot exceed diagnostic subtotal.");
		}

		BigDecimal total = subtotal.subtract(discount).add(tax);

		SaasDiagnosticOrder order = new SaasDiagnosticOrder();

		order.setTenantId(request.getTenantId());

		order.setPatientId(patient.getId());

		/*
		 * Historical field name retained. Value is canonical SaasStaff.id.
		 */
		order.setDoctorProfileId(doctor == null ? null : doctor.getId());

		order.setPrescriptionId(request.getPrescriptionId());

		order.setAppointmentId(request.getAppointmentId());

		order.setDiagnosticType(type);

		order.setStatus(SaasDiagnosticOrderStatus.ORDERED);

		order.setSubtotal(subtotal);

		order.setDiscountAmount(discount);

		order.setTaxAmount(tax);

		order.setTotalAmount(total);

		order.setClinicalNotes(trimToNull(request.getClinicalNotes()));

		order.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		order.setActive(true);

		SaasDiagnosticOrder saved = orderRepository.saveAndFlush(order);

		saved.setOrderNumber(generateOrderNumber(saved));

		saved = orderRepository.save(saved);

		saveOrderItems(saved.getTenantId(), saved.getId(), type, request.getItems());

		return toOrderResponse(saved);
	}

	/*
	 * ================================================================ STAFF READ
	 * ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasDiagnosticOrderResponse> getOrders(Long tenantId, String type) {

		if (type == null || type.isBlank()) {

			/*
			 * An untyped query spans both diagnostic modules. Caller must be able to view
			 * both.
			 */

			requirePermission(tenantId, SaasDiagnosticType.LAB, SaasPermissionAction.VIEW);

			requirePermission(tenantId, SaasDiagnosticType.RADIOLOGY, SaasPermissionAction.VIEW);

			return orderRepository.findByTenantIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId).stream()
					.map(this::toOrderResponse).toList();
		}

		SaasDiagnosticType diagnosticType = parseDiagnosticType(type);

		requirePermission(tenantId, diagnosticType, SaasPermissionAction.VIEW);

		return orderRepository
				.findByTenantIdAndDiagnosticTypeAndActiveTrueOrderByOrderDateTimeDesc(tenantId, diagnosticType).stream()
				.map(this::toOrderResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasDiagnosticOrderResponse getOrder(Long tenantId, Long orderId) {

		SaasDiagnosticOrder order = getOrderEntity(tenantId, orderId);

		requirePermission(tenantId, order.getDiagnosticType(), SaasPermissionAction.VIEW);

		return toOrderResponse(order);
	}

	@Transactional(readOnly = true)
	public List<SaasDiagnosticOrderResponse> getPatientOrders(Long tenantId, Long patientId) {

		tenantAccessService.validateTenantAccess(tenantId);

		List<SaasDiagnosticOrder> orders = orderRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId, patientId);

		return orders.stream().filter(this::canViewDiagnosticModule).map(this::toOrderResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasDiagnosticOrderResponse> getDoctorOrders(Long tenantId, Long doctorProfileId) {

		tenantAccessService.validateTenantAccess(tenantId);

		SaasStaff doctor = getDoctor(tenantId, doctorProfileId);

		validateDoctorOwnership(doctor);

		return orderRepository
				.findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId, doctor.getId())
				.stream().filter(this::canViewDiagnosticModule).map(this::toOrderResponse).toList();
	}

	/*
	 * ================================================================ STATUS
	 * LIFECYCLE ================================================================
	 */

	@Transactional
	public SaasDiagnosticOrderResponse updateStatus(Long tenantId, Long orderId, String status) {

		SaasDiagnosticOrder order = getOrderEntity(tenantId, orderId);

		requirePermission(tenantId, order.getDiagnosticType(), SaasPermissionAction.UPDATE);

		SaasDiagnosticOrderStatus target = parseOrderStatus(status);

		validateStatusTransition(order, target);

		order.setStatus(target);

		if (target == SaasDiagnosticOrderStatus.SAMPLE_COLLECTED) {

			order.setSampleCollectedAt(LocalDateTime.now());
		}

		/*
		 * REPORT_READY is reached through updateResult(), not through generic status
		 * endpoint.
		 */

		order.touch();

		return toOrderResponse(orderRepository.save(order));
	}

	/*
	 * ================================================================ RESULT
	 * ================================================================
	 */

	@Transactional
	public SaasDiagnosticOrderResponse updateResult(Long orderId, SaasDiagnosticResultRequest request) {

		if (request == null || request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required.");
		}

		SaasDiagnosticOrder order = getOrderEntity(request.getTenantId(), orderId);

		requirePermission(request.getTenantId(), order.getDiagnosticType(), SaasPermissionAction.UPDATE);

		if (order.getStatus() != SaasDiagnosticOrderStatus.IN_PROCESS) {

			throw new RuntimeException("Diagnostic result can be finalized only while order is IN_PROCESS.");
		}

		if (request.getResultSummary() == null || request.getResultSummary().isBlank()) {

			throw new RuntimeException("Result summary is required.");
		}

		order.setResultSummary(request.getResultSummary().trim());

		order.setResultDetails(trimToNull(request.getResultDetails()));

		order.setReportFileUrl(trimToNull(request.getReportFileUrl()));

		order.setStatus(SaasDiagnosticOrderStatus.REPORT_READY);

		order.setReportReadyAt(LocalDateTime.now());

		order.touch();

		SaasDiagnosticOrder saved = orderRepository.save(order);

		notificationService.createSystemNotification(

				saved.getTenantId(),

				saved.getDiagnosticType() == SaasDiagnosticType.LAB ? SaasNotificationType.LAB_REPORT
						: SaasNotificationType.RADIOLOGY_REPORT,

				SaasNotificationPriority.HIGH,

				saved.getDiagnosticType().name() + " report ready",

				"Report is ready for order " + saved.getOrderNumber(),

				saved.getId(),

				"DIAGNOSTIC_ORDER",

				saved.getDiagnosticType() == SaasDiagnosticType.LAB ? "/saas/lab" : "/saas/radiology");

		return toOrderResponse(saved);
	}

	/*
	 * ================================================================ BILLING
	 * ================================================================
	 */

	@Transactional
	public SaasInvoiceResponse createInvoice(Long tenantId, Long orderId) {

		SaasDiagnosticOrder order = getOrderEntity(tenantId, orderId);

		requirePermission(tenantId, order.getDiagnosticType(), SaasPermissionAction.CREATE);

		if (order.getStatus() == SaasDiagnosticOrderStatus.CANCELLED) {

			throw new RuntimeException("Invoice cannot be created for a cancelled diagnostic order.");
		}

		if (order.getInvoiceId() != null) {

			return billingService.getInvoice(tenantId, order.getInvoiceId());
		}

		List<SaasDiagnosticOrderItem> items = orderItemRepository.findByTenantIdAndOrderIdOrderByIdAsc(tenantId,
				orderId);

		if (items.isEmpty()) {

			throw new RuntimeException("No diagnostic order items found.");
		}

		SaasInvoiceRequest invoiceRequest = new SaasInvoiceRequest();

		invoiceRequest.setTenantId(tenantId);

		invoiceRequest.setPatientId(order.getPatientId());

		invoiceRequest.setDoctorProfileId(order.getDoctorProfileId());

		invoiceRequest.setInvoiceType(order.getDiagnosticType() == SaasDiagnosticType.LAB ? SaasInvoiceType.LAB.name()
				: SaasInvoiceType.RADIOLOGY.name());

		invoiceRequest.setDiscountAmount(order.getDiscountAmount());

		invoiceRequest.setTaxAmount(order.getTaxAmount());

		invoiceRequest.setPaidAmount(BigDecimal.ZERO);

		invoiceRequest.setNotes(order.getDiagnosticType().name() + " diagnostic invoice: " + order.getOrderNumber());

		List<SaasInvoiceItemRequest> invoiceItems = items.stream().map(item -> {

			SaasInvoiceItemRequest invoiceItem = new SaasInvoiceItemRequest();

			invoiceItem.setItemName(item.getTestName());

			invoiceItem.setItemType(order.getDiagnosticType().name());

			invoiceItem.setQuantity(1);

			invoiceItem.setUnitPrice(money(item.getPrice()));

			return invoiceItem;
		}).toList();

		invoiceRequest.setItems(invoiceItems);

		/*
		 * SaasBillingService itself additionally requires BILLING CREATE.
		 */

		SaasInvoiceResponse invoice = billingService.createInvoice(invoiceRequest);

		order.setInvoiceId(invoice.getId());

		order.touch();

		orderRepository.save(order);

		return invoice;
	}

	/*
	 * ================================================================ PATIENT SELF
	 * ACCESS ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasDiagnosticOrderResponse> getMyOrders(Long tenantId) {

		requirePatientRole();

		tenantAccessService.validateTenantAccess(tenantId);

		SaasPatient patient = patientSelfResolverService.resolvePatientEntity(tenantId);

		return orderRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId, patient.getId()).stream()
				.filter(this::isPatientVisible).map(this::toOrderResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasDiagnosticOrderResponse getMyOrder(Long tenantId, Long orderId) {

		requirePatientRole();

		SaasPatient patient = patientSelfResolverService.resolvePatientEntity(tenantId);

		SaasDiagnosticOrder order = getOrderEntity(tenantId, orderId);

		if (!patient.getId().equals(order.getPatientId())) {

			throw new AccessDeniedException("You cannot access another patient's diagnostic report.");
		}

		if (!isPatientVisible(order)) {

			throw new RuntimeException("Diagnostic report is not ready for patient access.");
		}

		return toOrderResponse(order);
	}

	/*
	 * ================================================================ STATE
	 * MACHINE ================================================================
	 */

	private void validateStatusTransition(SaasDiagnosticOrder order, SaasDiagnosticOrderStatus target) {

		SaasDiagnosticOrderStatus current = order.getStatus();

		if (current == target) {
			return;
		}

		if (current == SaasDiagnosticOrderStatus.CANCELLED || current == SaasDiagnosticOrderStatus.DELIVERED) {

			throw new RuntimeException("Diagnostic order is already in a terminal state.");
		}

		if (target == SaasDiagnosticOrderStatus.REPORT_READY) {

			throw new RuntimeException("Use result entry to mark diagnostic report ready.");
		}

		if (target == SaasDiagnosticOrderStatus.CANCELLED) {

			if (current != SaasDiagnosticOrderStatus.ORDERED) {

				throw new RuntimeException("Diagnostic order can be cancelled only while ORDERED.");
			}

			return;
		}

		if (target == SaasDiagnosticOrderStatus.DELIVERED) {

			if (current != SaasDiagnosticOrderStatus.REPORT_READY) {

				throw new RuntimeException("Only a REPORT_READY diagnostic order can be delivered.");
			}

			return;
		}

		if (order.getDiagnosticType() == SaasDiagnosticType.LAB) {

			if (current == SaasDiagnosticOrderStatus.ORDERED && target == SaasDiagnosticOrderStatus.SAMPLE_COLLECTED) {

				return;
			}

			if (current == SaasDiagnosticOrderStatus.SAMPLE_COLLECTED
					&& target == SaasDiagnosticOrderStatus.IN_PROCESS) {

				return;
			}

			throw new RuntimeException("Invalid LAB status transition: " + current + " → " + target);
		}

		/*
		 * Radiology does not require specimen collection.
		 */

		if (current == SaasDiagnosticOrderStatus.ORDERED && target == SaasDiagnosticOrderStatus.IN_PROCESS) {

			return;
		}

		throw new RuntimeException("Invalid RADIOLOGY status transition: " + current + " → " + target);
	}

	/*
	 * ================================================================ HELPERS
	 * ================================================================
	 */

	private void validateOrderRequest(SaasDiagnosticOrderRequest request) {

		if (request == null) {

			throw new RuntimeException("Diagnostic order request is required.");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required.");
		}

		if (request.getPatientId() == null) {

			throw new RuntimeException("patientId is required.");
		}

		if (request.getDiagnosticType() == null || request.getDiagnosticType().isBlank()) {

			throw new RuntimeException("diagnosticType is required.");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("At least one test is required.");
		}
	}

	private void requirePermission(Long tenantId, SaasDiagnosticType type, SaasPermissionAction action) {

		if (tenantId == null) {

			throw new RuntimeException("tenantId is required.");
		}

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, getDiagnosticModule(type), action);
	}

	private boolean canViewDiagnosticModule(SaasDiagnosticOrder order) {

		try {

			permissionService.requirePermission(order.getTenantId(), getDiagnosticModule(order.getDiagnosticType()),
					SaasPermissionAction.VIEW);

			return true;

		} catch (RuntimeException exception) {

			return false;
		}
	}

	private SaasDiagnosticOrder getOrderEntity(Long tenantId, Long orderId) {

		return orderRepository.findByIdAndTenantIdAndActiveTrue(orderId, tenantId)
				.orElseThrow(() -> new RuntimeException("Diagnostic order not found."));
	}

	private SaasStaff getDoctor(Long tenantId, Long doctorStaffId) {

		SaasStaff doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Doctor not found."));

		if (doctor.getStaffRole() != SaasStaffRole.DOCTOR) {

			throw new RuntimeException("Selected staff member is not a doctor.");
		}

		return doctor;
	}

	private void validateDoctorOwnership(SaasStaff doctor) {

		if (doctor == null) {
			return;
		}

		String role = normalizeRole(CurrentUserUtil.getRole());

		if ("DOCTOR".equals(role)) {

			if (CurrentUserUtil.getUserId() == null || !CurrentUserUtil.getUserId().equals(doctor.getAuthUserId())) {

				throw new AccessDeniedException("Doctor can create or view only their own diagnostic orders.");
			}
		}
	}

	private void requirePatientRole() {

		if (!"PATIENT".equals(normalizeRole(CurrentUserUtil.getRole()))) {

			throw new AccessDeniedException("Patient access is required.");
		}
	}

	private boolean isPatientVisible(SaasDiagnosticOrder order) {

		return order.getStatus() == SaasDiagnosticOrderStatus.REPORT_READY
				|| order.getStatus() == SaasDiagnosticOrderStatus.DELIVERED;
	}

	private BigDecimal calculateSubtotal(Long tenantId, SaasDiagnosticType type,
			List<SaasDiagnosticOrderItemRequest> items) {

		BigDecimal subtotal = BigDecimal.ZERO;

		for (SaasDiagnosticOrderItemRequest item : items) {

			if (item == null || item.getTestId() == null) {

				throw new RuntimeException("Diagnostic test is required.");
			}

			SaasDiagnosticTest test = testRepository.findByIdAndTenantIdAndActiveTrue(item.getTestId(), tenantId)
					.orElseThrow(() -> new RuntimeException("Diagnostic test not found."));

			if (test.getDiagnosticType() != type) {

				throw new RuntimeException("Selected test does not match diagnostic type.");
			}

			subtotal = subtotal.add(money(test.getPrice()));
		}

		return subtotal;
	}

	private void saveOrderItems(Long tenantId, Long orderId, SaasDiagnosticType type,
			List<SaasDiagnosticOrderItemRequest> items) {

		for (SaasDiagnosticOrderItemRequest item : items) {

			SaasDiagnosticTest test = testRepository.findByIdAndTenantIdAndActiveTrue(item.getTestId(), tenantId)
					.orElseThrow(() -> new RuntimeException("Diagnostic test not found."));

			if (test.getDiagnosticType() != type) {

				throw new RuntimeException("Selected test does not match diagnostic type.");
			}

			SaasDiagnosticOrderItem orderItem = new SaasDiagnosticOrderItem();

			orderItem.setTenantId(tenantId);

			orderItem.setOrderId(orderId);

			orderItem.setTestId(test.getId());

			orderItem.setTestName(test.getTestName());

			orderItem.setTestCode(test.getTestCode());

			orderItem.setPrice(money(test.getPrice()));

			orderItemRepository.save(orderItem);
		}
	}

	private SaasDiagnosticType parseDiagnosticType(String value) {

		if (value == null || value.isBlank()) {

			throw new RuntimeException("diagnosticType is required.");
		}

		try {

			return SaasDiagnosticType.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (Exception exception) {

			throw new RuntimeException("Invalid diagnosticType: " + value);
		}
	}

	private SaasDiagnosticOrderStatus parseOrderStatus(String value) {

		if (value == null || value.isBlank()) {

			throw new RuntimeException("status is required.");
		}

		try {

			return SaasDiagnosticOrderStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));

		} catch (Exception exception) {

			throw new RuntimeException("Invalid diagnostic status: " + value);
		}
	}

	private String normalizeRole(String role) {

		if (role == null) {
			return "";
		}

		return role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");
	}

	private BigDecimal money(BigDecimal value) {

		return value == null ? BigDecimal.ZERO : value;
	}

	private String trimToNull(String value) {

		if (value == null) {
			return null;
		}

		String trimmed = value.trim();

		return trimmed.isBlank() ? null : trimmed;
	}

	private String generateOrderNumber(SaasDiagnosticOrder order) {

		return order.getDiagnosticType().name() + "-" + order.getTenantId() + "-"
				+ String.format("%05d", order.getId());
	}

	/*
	 * ================================================================ RESPONSE
	 * MAPPING ================================================================
	 */

	private SaasDiagnosticTestResponse toTestResponse(SaasDiagnosticTest test) {

		return new SaasDiagnosticTestResponse(

				test.getId(),

				test.getTenantId(),

				test.getDiagnosticType().name(),

				test.getTestName(),

				test.getTestCode(),

				test.getCategory(),

				test.getDescription(),

				test.getPrice(),

				test.getActive());
	}

	private SaasDiagnosticOrderResponse toOrderResponse(SaasDiagnosticOrder order) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(order.getPatientId(), order.getTenantId()).orElse(null);

		SaasStaff doctor = null;

		if (order.getDoctorProfileId() != null) {

			doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(order.getDoctorProfileId(), order.getTenantId())
					.filter(staff -> staff.getStaffRole() == SaasStaffRole.DOCTOR).orElse(null);
		}

		List<SaasDiagnosticOrderItemResponse> items = orderItemRepository
				.findByTenantIdAndOrderIdOrderByIdAsc(order.getTenantId(), order.getId()).stream()
				.map(item -> new SaasDiagnosticOrderItemResponse(

						item.getId(),

						item.getTestId(),

						item.getTestName(),

						item.getTestCode(),

						item.getPrice()))
				.toList();

		return new SaasDiagnosticOrderResponse(

				order.getId(),

				order.getTenantId(),

				order.getOrderNumber(),

				order.getDiagnosticType().name(),

				order.getPatientId(),

				patient == null ? null : patient.getPatientName(),

				patient == null ? null : patient.getMobile(),

				order.getDoctorProfileId(),

				doctor == null ? null : doctor.getStaffName(),

				doctor == null ? null : doctor.getDepartment(),

				order.getPrescriptionId(),

				order.getAppointmentId(),

				order.getInvoiceId(),

				order.getSubtotal(),

				order.getDiscountAmount(),

				order.getTaxAmount(),

				order.getTotalAmount(),

				order.getStatus().name(),

				order.getClinicalNotes(),

				order.getResultSummary(),

				order.getResultDetails(),

				order.getReportFileUrl(),

				order.getSampleCollectedAt(),

				order.getReportReadyAt(),

				order.getOrderDateTime(),

				items);
	}

	private TenantModule getDiagnosticModule(SaasDiagnosticType type) {

		return type == SaasDiagnosticType.LAB ? TenantModule.LAB : TenantModule.RADIOLOGY;
	}
}