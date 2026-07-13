package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.SaasDiagnosticOrderStatus;
import com.example.medi.saas.enums.SaasDiagnosticType;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SaasDiagnosticService {

    private final SaasDiagnosticTestRepository testRepository;
    private final SaasDiagnosticOrderRepository orderRepository;
    private final SaasDiagnosticOrderItemRepository orderItemRepository;
    private final SaasPatientRepository patientRepository;
    private final SaasDoctorProfileRepository doctorRepository;
    private final SaasBillingService billingService;
    private final TenantAccessService tenantAccessService;
    private final SaasNotificationService notificationService;
    private final SaasPermissionService permissionService;

    public SaasDiagnosticService(
            SaasDiagnosticTestRepository testRepository,
            SaasDiagnosticOrderRepository orderRepository,
            SaasDiagnosticOrderItemRepository orderItemRepository,
            SaasPatientRepository patientRepository,
            SaasDoctorProfileRepository doctorRepository,
            SaasBillingService billingService,
            TenantAccessService tenantAccessService,
            SaasNotificationService notificationService,
            SaasPermissionService permissionService
    ) {
        this.testRepository = testRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.billingService = billingService;
        this.tenantAccessService = tenantAccessService;
        this.notificationService = notificationService;
        this.permissionService = permissionService;
    }

    public SaasDiagnosticTestResponse createTest(SaasDiagnosticTestRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        getDiagnosticModule(request.getDiagnosticType()),
    	        SaasPermissionAction.CREATE
    	);

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getDiagnosticType() == null || request.getDiagnosticType().isBlank()) {
            throw new RuntimeException("diagnosticType is required");
        }

        if (request.getTestName() == null || request.getTestName().isBlank()) {
            throw new RuntimeException("Test name is required");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasDiagnosticType type = SaasDiagnosticType.valueOf(request.getDiagnosticType().toUpperCase());

        SaasDiagnosticTest test = new SaasDiagnosticTest();
        test.setTenantId(request.getTenantId());
        test.setDiagnosticType(type);
        test.setTestName(request.getTestName().trim());
        test.setTestCode(request.getTestCode());
        test.setCategory(request.getCategory());
        test.setDescription(request.getDescription());
        test.setPrice(request.getPrice() == null ? BigDecimal.ZERO : request.getPrice());
        test.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        test.setActive(true);

        return toTestResponse(testRepository.save(test));
    }

    public List<SaasDiagnosticTestResponse> getTests(Long tenantId, String type) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        getDiagnosticModule(type),
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasDiagnosticType diagnosticType = SaasDiagnosticType.valueOf(type.toUpperCase());

        return testRepository
                .findByTenantIdAndDiagnosticTypeAndActiveTrueOrderByTestNameAsc(tenantId, diagnosticType)
                .stream()
                .map(this::toTestResponse)
                .toList();
    }

    @Transactional
    public SaasDiagnosticOrderResponse createOrder(SaasDiagnosticOrderRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        getDiagnosticModule(request.getDiagnosticType()),
    	        SaasPermissionAction.CREATE
    	);

        validateOrderRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        if (request.getDoctorProfileId() != null) {
            doctorRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getDoctorProfileId(), request.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Doctor not found"));
        }

        SaasDiagnosticType type = SaasDiagnosticType.valueOf(request.getDiagnosticType().toUpperCase());

        BigDecimal subtotal = calculateSubtotal(request.getTenantId(), type, request.getItems());
        BigDecimal discount = request.getDiscountAmount() == null ? BigDecimal.ZERO : request.getDiscountAmount();
        BigDecimal tax = request.getTaxAmount() == null ? BigDecimal.ZERO : request.getTaxAmount();

        BigDecimal total = subtotal.subtract(discount).add(tax);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO;
        }

        SaasDiagnosticOrder order = new SaasDiagnosticOrder();
        order.setTenantId(request.getTenantId());
        order.setPatientId(patient.getId());
        order.setDoctorProfileId(request.getDoctorProfileId());
        order.setPrescriptionId(request.getPrescriptionId());
        order.setAppointmentId(request.getAppointmentId());
        order.setDiagnosticType(type);
        order.setStatus(SaasDiagnosticOrderStatus.ORDERED);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discount);
        order.setTaxAmount(tax);
        order.setTotalAmount(total);
        order.setClinicalNotes(request.getClinicalNotes());
        order.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        order.setActive(true);

        SaasDiagnosticOrder saved = orderRepository.save(order);

        saved.setOrderNumber(generateOrderNumber(saved));
        saved = orderRepository.save(saved);

        saveOrderItems(saved.getTenantId(), saved.getId(), type, request.getItems());

        return toOrderResponse(saved);
    }

    public List<SaasDiagnosticOrderResponse> getOrders(Long tenantId, String type) {
    	
    	if (type != null && !type.isBlank()) {
    	    permissionService.requirePermission(
    	            tenantId,
    	            getDiagnosticModule(type),
    	            SaasPermissionAction.VIEW
    	    );
    	}

        tenantAccessService.validateTenantAccess(tenantId);

        if (type != null && !type.isBlank()) {
            SaasDiagnosticType diagnosticType = SaasDiagnosticType.valueOf(type.toUpperCase());

            return orderRepository
                    .findByTenantIdAndDiagnosticTypeAndActiveTrueOrderByOrderDateTimeDesc(tenantId, diagnosticType)
                    .stream()
                    .map(this::toOrderResponse)
                    .toList();
        }

        return orderRepository
                .findByTenantIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId)
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    public SaasDiagnosticOrderResponse getOrder(Long tenantId, Long orderId) {

        tenantAccessService.validateTenantAccess(tenantId);

        SaasDiagnosticOrder order = orderRepository
                .findByIdAndTenantIdAndActiveTrue(orderId, tenantId)
                .orElseThrow(() -> new RuntimeException("Diagnostic order not found"));
        
        permissionService.requirePermission(
                tenantId,
                getDiagnosticModule(order.getDiagnosticType()),
                SaasPermissionAction.VIEW
        );

        return toOrderResponse(order);
    }

    public List<SaasDiagnosticOrderResponse> getPatientOrders(Long tenantId, Long patientId) {

        tenantAccessService.validateTenantAccess(tenantId);

        return orderRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId, patientId)
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    public List<SaasDiagnosticOrderResponse> getDoctorOrders(Long tenantId, Long doctorProfileId) {

        tenantAccessService.validateTenantAccess(tenantId);

        return orderRepository
                .findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId, doctorProfileId)
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    public SaasDiagnosticOrderResponse updateStatus(Long tenantId, Long orderId, String status) {

        tenantAccessService.validateTenantAccess(tenantId);

        SaasDiagnosticOrder order = orderRepository
                .findByIdAndTenantIdAndActiveTrue(orderId, tenantId)
                .orElseThrow(() -> new RuntimeException("Diagnostic order not found"));
        
        permissionService.requirePermission(
                tenantId,
                getDiagnosticModule(order.getDiagnosticType()),
                SaasPermissionAction.UPDATE
        );

        SaasDiagnosticOrderStatus newStatus =
                SaasDiagnosticOrderStatus.valueOf(status.toUpperCase());

        order.setStatus(newStatus);

        if (newStatus == SaasDiagnosticOrderStatus.SAMPLE_COLLECTED) {
            order.setSampleCollectedAt(java.time.LocalDateTime.now());
        }

        if (newStatus == SaasDiagnosticOrderStatus.REPORT_READY) {
            order.setReportReadyAt(java.time.LocalDateTime.now());
        }

        order.touch();

        return toOrderResponse(orderRepository.save(order));
    }

    public SaasDiagnosticOrderResponse updateResult(Long orderId, SaasDiagnosticResultRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasDiagnosticOrder order = orderRepository
                .findByIdAndTenantIdAndActiveTrue(orderId, request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Diagnostic order not found"));
        
        permissionService.requirePermission(
                request.getTenantId(),
                getDiagnosticModule(order.getDiagnosticType()),
                SaasPermissionAction.UPDATE
        );

        order.setResultSummary(request.getResultSummary());
        order.setResultDetails(request.getResultDetails());
        order.setReportFileUrl(request.getReportFileUrl());
        order.setStatus(SaasDiagnosticOrderStatus.REPORT_READY);
        order.setReportReadyAt(java.time.LocalDateTime.now());
        order.touch();

        SaasDiagnosticOrder saved = orderRepository.save(order);

        notificationService.createSystemNotification(
                saved.getTenantId(),
                saved.getDiagnosticType() == SaasDiagnosticType.LAB
                        ? SaasNotificationType.LAB_REPORT
                        : SaasNotificationType.RADIOLOGY_REPORT,
                SaasNotificationPriority.HIGH,
                saved.getDiagnosticType().name() + " report ready",
                "Report is ready for order " + saved.getOrderNumber(),
                saved.getId(),
                "DIAGNOSTIC_ORDER",
                saved.getDiagnosticType() == SaasDiagnosticType.LAB ? "/saas/lab" : "/saas/radiology"
        );

        return toOrderResponse(saved);
    }

    @Transactional
    public SaasInvoiceResponse createInvoice(Long tenantId, Long orderId) {

        tenantAccessService.validateTenantAccess(tenantId);

        SaasDiagnosticOrder order = orderRepository
                .findByIdAndTenantIdAndActiveTrue(orderId, tenantId)
                .orElseThrow(() -> new RuntimeException("Diagnostic order not found"));
        
        permissionService.requirePermission(
                tenantId,
                getDiagnosticModule(order.getDiagnosticType()),
                SaasPermissionAction.CREATE
        );

        if (order.getInvoiceId() != null) {
            return billingService.getInvoice(tenantId, order.getInvoiceId());
        }

        List<SaasDiagnosticOrderItem> items =
                orderItemRepository.findByTenantIdAndOrderIdOrderByIdAsc(tenantId, orderId);

        if (items.isEmpty()) {
            throw new RuntimeException("No order items found");
        }

        SaasInvoiceRequest invoiceRequest = new SaasInvoiceRequest();
        invoiceRequest.setTenantId(tenantId);
        invoiceRequest.setPatientId(order.getPatientId());
        invoiceRequest.setDoctorProfileId(order.getDoctorProfileId());
        invoiceRequest.setInvoiceType(order.getDiagnosticType() == SaasDiagnosticType.LAB ? "LAB" : "RADIOLOGY");
        invoiceRequest.setDiscountAmount(order.getDiscountAmount());
        invoiceRequest.setTaxAmount(order.getTaxAmount());
        invoiceRequest.setPaidAmount(BigDecimal.ZERO);
        invoiceRequest.setNotes(order.getDiagnosticType().name() + " diagnostic invoice: " + order.getOrderNumber());

        List<SaasInvoiceItemRequest> invoiceItems = items.stream()
                .map(item -> {
                    SaasInvoiceItemRequest invoiceItem = new SaasInvoiceItemRequest();
                    invoiceItem.setItemName(item.getTestName());
                    invoiceItem.setItemType(order.getDiagnosticType().name());
                    invoiceItem.setQuantity(1);
                    invoiceItem.setUnitPrice(item.getPrice());
                    return invoiceItem;
                })
                .toList();

        invoiceRequest.setItems(invoiceItems);

        SaasInvoiceResponse invoice = billingService.createInvoice(invoiceRequest);

        order.setInvoiceId(invoice.getId());
        order.touch();

        orderRepository.save(order);

        return invoice;
    }

    private void validateOrderRequest(SaasDiagnosticOrderRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getPatientId() == null) {
            throw new RuntimeException("patientId is required");
        }

        if (request.getDiagnosticType() == null || request.getDiagnosticType().isBlank()) {
            throw new RuntimeException("diagnosticType is required");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("At least one test is required");
        }
    }

    private BigDecimal calculateSubtotal(
            Long tenantId,
            SaasDiagnosticType type,
            List<SaasDiagnosticOrderItemRequest> items
    ) {
        BigDecimal subtotal = BigDecimal.ZERO;

        for (SaasDiagnosticOrderItemRequest item : items) {
            SaasDiagnosticTest test = testRepository
                    .findByIdAndTenantIdAndActiveTrue(item.getTestId(), tenantId)
                    .orElseThrow(() -> new RuntimeException("Diagnostic test not found"));

            if (test.getDiagnosticType() != type) {
                throw new RuntimeException("Selected test does not match diagnostic type");
            }

            subtotal = subtotal.add(test.getPrice() == null ? BigDecimal.ZERO : test.getPrice());
        }

        return subtotal;
    }

    private void saveOrderItems(
            Long tenantId,
            Long orderId,
            SaasDiagnosticType type,
            List<SaasDiagnosticOrderItemRequest> items
    ) {
        for (SaasDiagnosticOrderItemRequest item : items) {
            SaasDiagnosticTest test = testRepository
                    .findByIdAndTenantIdAndActiveTrue(item.getTestId(), tenantId)
                    .orElseThrow(() -> new RuntimeException("Diagnostic test not found"));

            if (test.getDiagnosticType() != type) {
                throw new RuntimeException("Selected test does not match diagnostic type");
            }

            SaasDiagnosticOrderItem orderItem = new SaasDiagnosticOrderItem();
            orderItem.setTenantId(tenantId);
            orderItem.setOrderId(orderId);
            orderItem.setTestId(test.getId());
            orderItem.setTestName(test.getTestName());
            orderItem.setTestCode(test.getTestCode());
            orderItem.setPrice(test.getPrice() == null ? BigDecimal.ZERO : test.getPrice());

            orderItemRepository.save(orderItem);
        }
    }

    private String generateOrderNumber(SaasDiagnosticOrder order) {
        return order.getDiagnosticType().name()
                + "-"
                + order.getTenantId()
                + "-"
                + String.format("%05d", order.getId());
    }

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
                test.getActive()
        );
    }

    private SaasDiagnosticOrderResponse toOrderResponse(SaasDiagnosticOrder order) {

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(order.getPatientId(), order.getTenantId())
                .orElse(null);

        SaasDoctorProfile doctor = null;

        if (order.getDoctorProfileId() != null) {
            doctor = doctorRepository
                    .findByIdAndTenantIdAndActiveTrue(order.getDoctorProfileId(), order.getTenantId())
                    .orElse(null);
        }

        List<SaasDiagnosticOrderItemResponse> items =
                orderItemRepository
                        .findByTenantIdAndOrderIdOrderByIdAsc(order.getTenantId(), order.getId())
                        .stream()
                        .map(item -> new SaasDiagnosticOrderItemResponse(
                                item.getId(),
                                item.getTestId(),
                                item.getTestName(),
                                item.getTestCode(),
                                item.getPrice()
                        ))
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
                doctor == null ? null : doctor.getDoctorName(),
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
                items
        );
    }
    
    private TenantModule getDiagnosticModule(String type) {
        if (type == null) {
            throw new RuntimeException("diagnosticType is required");
        }

        return type.equalsIgnoreCase("LAB")
                ? TenantModule.LAB
                : TenantModule.RADIOLOGY;
    }

    private TenantModule getDiagnosticModule(SaasDiagnosticType type) {
        return type == SaasDiagnosticType.LAB
                ? TenantModule.LAB
                : TenantModule.RADIOLOGY;
    }
}