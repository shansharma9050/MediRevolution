package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.SaasInvoiceType;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPaymentMode;
import com.example.medi.saas.enums.SaasPaymentStatus;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SaasBillingService {

    private final SaasInvoiceRepository invoiceRepository;
    private final SaasInvoiceItemRepository itemRepository;
    private final SaasPaymentReceiptRepository receiptRepository;
    private final SaasPatientRepository patientRepository;
    private final SaasDoctorProfileRepository doctorRepository;
    private final SaasOpdVisitRepository opdRepository;
    private final SaasIpdAdmissionRepository admissionRepository;
    private final SaasIpdChargeRepository ipdChargeRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasNotificationService notificationService;
    private final SaasPermissionService permissionService;
    

    public SaasBillingService(
            SaasInvoiceRepository invoiceRepository,
            SaasInvoiceItemRepository itemRepository,
            SaasPaymentReceiptRepository receiptRepository,
            SaasPatientRepository patientRepository,
            SaasDoctorProfileRepository doctorRepository,
            SaasOpdVisitRepository opdRepository,
            SaasIpdAdmissionRepository admissionRepository,
            SaasIpdChargeRepository ipdChargeRepository,
            TenantAccessService tenantAccessService,
            SaasNotificationService notificationService,
            SaasPermissionService permissionService
    ) {
        this.invoiceRepository = invoiceRepository;
        this.itemRepository = itemRepository;
        this.receiptRepository = receiptRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.opdRepository = opdRepository;
        this.admissionRepository = admissionRepository;
        this.ipdChargeRepository = ipdChargeRepository;
        this.tenantAccessService = tenantAccessService;
        this.notificationService = notificationService;
        this.permissionService = permissionService;
    }

    @Transactional
    public SaasInvoiceResponse createInvoice(SaasInvoiceRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.BILLING,
    	        SaasPermissionAction.CREATE
    	);

        validateInvoiceRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        if (request.getDoctorProfileId() != null) {
            doctorRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getDoctorProfileId(), request.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Doctor not found"));
        }

        SaasInvoiceType invoiceType = SaasInvoiceType.valueOf(request.getInvoiceType().toUpperCase());

        if (request.getOpdVisitId() != null) {
            opdRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getOpdVisitId(), request.getTenantId())
                    .orElseThrow(() -> new RuntimeException("OPD visit not found"));
        }

        if (request.getIpdAdmissionId() != null) {
            admissionRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getIpdAdmissionId(), request.getTenantId())
                    .orElseThrow(() -> new RuntimeException("IPD admission not found"));
        }

        BigDecimal subtotal = calculateSubtotal(request.getItems());
        BigDecimal discount = request.getDiscountAmount() == null ? BigDecimal.ZERO : request.getDiscountAmount();
        BigDecimal tax = request.getTaxAmount() == null ? BigDecimal.ZERO : request.getTaxAmount();
        BigDecimal total = subtotal.subtract(discount).add(tax);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO;
        }

        BigDecimal paid = request.getPaidAmount() == null ? BigDecimal.ZERO : request.getPaidAmount();

        if (paid.compareTo(total) > 0) {
            paid = total;
        }

        BigDecimal due = total.subtract(paid);

        SaasInvoice invoice = new SaasInvoice();
        invoice.setTenantId(request.getTenantId());
        invoice.setPatientId(patient.getId());
        invoice.setDoctorProfileId(request.getDoctorProfileId());
        invoice.setOpdVisitId(request.getOpdVisitId());
        invoice.setIpdAdmissionId(request.getIpdAdmissionId());
        invoice.setInvoiceType(invoiceType);
        invoice.setSubtotal(subtotal);
        invoice.setDiscountAmount(discount);
        invoice.setTaxAmount(tax);
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(paid);
        invoice.setDueAmount(due);
        invoice.setNotes(request.getNotes());
        invoice.setTransactionId(request.getTransactionId());
        invoice.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        invoice.setActive(true);

        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setPaymentStatus(SaasPaymentStatus.UNPAID);
        } else if (paid.compareTo(total) < 0) {
            invoice.setPaymentStatus(SaasPaymentStatus.PARTIAL);
        } else {
            invoice.setPaymentStatus(SaasPaymentStatus.PAID);
        }

        if (request.getPaymentMode() != null && !request.getPaymentMode().isBlank()) {
            invoice.setPaymentMode(SaasPaymentMode.valueOf(request.getPaymentMode().toUpperCase()));
        }

        if (invoice.getPaymentStatus() == SaasPaymentStatus.PAID
                || invoice.getPaymentStatus() == SaasPaymentStatus.PARTIAL) {
            invoice.setPaymentDateTime(java.time.LocalDateTime.now());
        }

        SaasInvoice savedInvoice = invoiceRepository.save(invoice);

        savedInvoice.setInvoiceNumber(generateInvoiceNumber(savedInvoice));
        savedInvoice = invoiceRepository.save(savedInvoice);

        saveItems(savedInvoice.getTenantId(), savedInvoice.getId(), request.getItems());

        if (paid.compareTo(BigDecimal.ZERO) > 0 && savedInvoice.getPaymentMode() != null) {
            createReceipt(
                    savedInvoice,
                    paid,
                    savedInvoice.getPaymentMode(),
                    request.getTransactionId(),
                    "Payment received while creating invoice"
            );
        }

        
        if (savedInvoice.getDueAmount() != null
                && savedInvoice.getDueAmount().compareTo(BigDecimal.ZERO) > 0) {

        	notificationService.createSystemNotificationIfNotExists(
                    savedInvoice.getTenantId(),
                    SaasNotificationType.BILLING,
                    SaasNotificationPriority.HIGH,
                    "Payment due",
                    "Invoice " + savedInvoice.getInvoiceNumber()
                            + " has due amount ₹" + savedInvoice.getDueAmount(),
                    savedInvoice.getId(),
                    "INVOICE",
                    "/saas/billing"
            );
        }
        
        return toResponse(savedInvoice);
    }

    public List<SaasInvoiceResponse> getInvoices(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return invoiceRepository
                .findByTenantIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasInvoiceResponse getInvoice(Long tenantId, Long invoiceId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasInvoice invoice = invoiceRepository
                .findByIdAndTenantIdAndActiveTrue(invoiceId, tenantId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        return toResponse(invoice);
    }

    public List<SaasInvoiceResponse> getPatientInvoices(Long tenantId, Long patientId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        patientRepository
                .findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        return invoiceRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId, patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasInvoiceResponse> getIpdInvoices(Long tenantId, Long admissionId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        admissionRepository
                .findByIdAndTenantIdAndActiveTrue(admissionId, tenantId)
                .orElseThrow(() -> new RuntimeException("IPD admission not found"));

        return invoiceRepository
                .findByTenantIdAndIpdAdmissionIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId, admissionId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SaasInvoiceResponse createIpdFinalInvoice(Long tenantId, Long admissionId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.CREATE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasIpdAdmission admission = admissionRepository
                .findByIdAndTenantIdAndActiveTrue(admissionId, tenantId)
                .orElseThrow(() -> new RuntimeException("IPD admission not found"));

        List<SaasIpdCharge> charges =
                ipdChargeRepository.findByTenantIdAndAdmissionIdOrderByChargeDateTimeDesc(
                        tenantId,
                        admissionId
                );

        if (charges.isEmpty()) {
            throw new RuntimeException("No IPD charges found for this admission");
        }

        SaasInvoiceRequest request = new SaasInvoiceRequest();
        request.setTenantId(tenantId);
        request.setPatientId(admission.getPatientId());
        request.setDoctorProfileId(admission.getDoctorProfileId());
        request.setIpdAdmissionId(admission.getId());
        request.setInvoiceType("IPD");
        request.setDiscountAmount(BigDecimal.ZERO);
        request.setTaxAmount(BigDecimal.ZERO);
        request.setPaidAmount(admission.getAdvanceAmount() == null ? BigDecimal.ZERO : admission.getAdvanceAmount());
        request.setPaymentMode("CASH");
        request.setNotes("IPD final bill generated from admission charges");

        List<SaasInvoiceItemRequest> items = charges.stream()
                .map(charge -> {
                    SaasInvoiceItemRequest item = new SaasInvoiceItemRequest();
                    item.setItemName(charge.getDescription());
                    item.setItemType(charge.getChargeType().name());
                    item.setQuantity(1);
                    item.setUnitPrice(charge.getAmount());
                    return item;
                })
                .toList();

        request.setItems(items);

        return createInvoice(request);
    }

    @Transactional
    public SaasInvoiceResponse updatePayment(
            Long tenantId,
            Long invoiceId,
            String paymentStatus,
            String paymentMode,
            BigDecimal paidAmount,
            String transactionId
    ) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.UPDATE
    	);
    	
        tenantAccessService.validateTenantAccess(tenantId);

        SaasInvoice invoice = invoiceRepository
                .findByIdAndTenantIdAndActiveTrue(invoiceId, tenantId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        SaasPaymentStatus status = SaasPaymentStatus.valueOf(paymentStatus.toUpperCase());
        SaasPaymentMode mode = SaasPaymentMode.valueOf(paymentMode.toUpperCase());

        BigDecimal newPaidAmount = paidAmount == null ? invoice.getTotalAmount() : paidAmount;

        if (newPaidAmount.compareTo(invoice.getTotalAmount()) > 0) {
            newPaidAmount = invoice.getTotalAmount();
        }

        invoice.setPaymentStatus(status);
        invoice.setPaymentMode(mode);
        invoice.setPaidAmount(newPaidAmount);
        invoice.setDueAmount(invoice.getTotalAmount().subtract(newPaidAmount));
        invoice.setTransactionId(transactionId);
        invoice.setPaymentDateTime(java.time.LocalDateTime.now());
        invoice.touch();

        SaasInvoice saved = invoiceRepository.save(invoice);

        if (newPaidAmount.compareTo(BigDecimal.ZERO) > 0) {
            createReceipt(saved, newPaidAmount, mode, transactionId, "Payment updated");
        }
        
        if (saved.getPaymentStatus() == SaasPaymentStatus.PAID) {
        	notificationService.createSystemNotificationIfNotExists(
                    saved.getTenantId(),
                    SaasNotificationType.BILLING,
                    SaasNotificationPriority.MEDIUM,
                    "Payment received",
                    "Invoice " + saved.getInvoiceNumber() + " payment completed.",
                    saved.getId(),
                    "INVOICE",
                    "/saas/billing"
            );
        }

        return toResponse(saved);
    }

    public List<SaasPaymentReceiptResponse> getReceipts(Long tenantId, Long invoiceId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return receiptRepository
                .findByTenantIdAndInvoiceIdOrderByReceiptDateTimeDesc(tenantId, invoiceId)
                .stream()
                .map(this::toReceiptResponse)
                .toList();
    }

    private void validateInvoiceRequest(SaasInvoiceRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getPatientId() == null) {
            throw new RuntimeException("patientId is required");
        }

        if (request.getInvoiceType() == null || request.getInvoiceType().isBlank()) {
            throw new RuntimeException("invoiceType is required");
        }

        try {
            SaasInvoiceType.valueOf(request.getInvoiceType().toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Invalid invoiceType: " + request.getInvoiceType());
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Invoice items are required");
        }
    }

    private BigDecimal calculateSubtotal(List<SaasInvoiceItemRequest> items) {

        BigDecimal subtotal = BigDecimal.ZERO;

        if (items == null) {
            return subtotal;
        }

        for (SaasInvoiceItemRequest item : items) {

            if (item.getItemName() == null || item.getItemName().isBlank()) {
                continue;
            }

            int quantity = item.getQuantity() == null || item.getQuantity() <= 0
                    ? 1
                    : item.getQuantity();

            BigDecimal unitPrice = item.getUnitPrice() == null
                    ? BigDecimal.ZERO
                    : item.getUnitPrice();

            subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(quantity)));
        }

        return subtotal;
    }

    private void saveItems(Long tenantId, Long invoiceId, List<SaasInvoiceItemRequest> items) {

        if (items == null || items.isEmpty()) {
            return;
        }

        for (SaasInvoiceItemRequest item : items) {

            if (item.getItemName() == null || item.getItemName().isBlank()) {
                continue;
            }

            int quantity = item.getQuantity() == null || item.getQuantity() <= 0
                    ? 1
                    : item.getQuantity();

            BigDecimal unitPrice = item.getUnitPrice() == null
                    ? BigDecimal.ZERO
                    : item.getUnitPrice();

            SaasInvoiceItem invoiceItem = new SaasInvoiceItem();
            invoiceItem.setTenantId(tenantId);
            invoiceItem.setInvoiceId(invoiceId);
            invoiceItem.setItemName(item.getItemName());
            invoiceItem.setItemType(item.getItemType());
            invoiceItem.setQuantity(quantity);
            invoiceItem.setUnitPrice(unitPrice);
            invoiceItem.setTotalPrice(unitPrice.multiply(BigDecimal.valueOf(quantity)));

            itemRepository.save(invoiceItem);
        }
    }

    private void createReceipt(
            SaasInvoice invoice,
            BigDecimal paidAmount,
            SaasPaymentMode paymentMode,
            String transactionId,
            String remarks
    ) {
        SaasPaymentReceipt receipt = new SaasPaymentReceipt();
        receipt.setTenantId(invoice.getTenantId());
        receipt.setInvoiceId(invoice.getId());
        receipt.setPaidAmount(paidAmount);
        receipt.setPaymentMode(paymentMode);
        receipt.setTransactionId(transactionId);
        receipt.setRemarks(remarks);
        receipt.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

        SaasPaymentReceipt saved = receiptRepository.save(receipt);
        saved.setReceiptNumber("RCT-" + saved.getTenantId() + "-" + String.format("%05d", saved.getId()));
        receiptRepository.save(saved);
    }

    private String generateInvoiceNumber(SaasInvoice invoice) {
        return "INV-" + invoice.getTenantId() + "-" + String.format("%05d", invoice.getId());
    }

    private SaasInvoiceResponse toResponse(SaasInvoice invoice) {

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(invoice.getPatientId(), invoice.getTenantId())
                .orElse(null);

        SaasDoctorProfile doctor = null;

        if (invoice.getDoctorProfileId() != null) {
            doctor = doctorRepository
                    .findByIdAndTenantIdAndActiveTrue(invoice.getDoctorProfileId(), invoice.getTenantId())
                    .orElse(null);
        }

        SaasIpdAdmission admission = null;

        if (invoice.getIpdAdmissionId() != null) {
            admission = admissionRepository
                    .findByIdAndTenantIdAndActiveTrue(invoice.getIpdAdmissionId(), invoice.getTenantId())
                    .orElse(null);
        }

        List<SaasInvoiceItemResponse> items =
                itemRepository
                        .findByTenantIdAndInvoiceIdOrderByIdAsc(invoice.getTenantId(), invoice.getId())
                        .stream()
                        .map(item -> new SaasInvoiceItemResponse(
                                item.getId(),
                                item.getItemName(),
                                item.getItemType(),
                                item.getQuantity(),
                                item.getUnitPrice(),
                                item.getTotalPrice()
                        ))
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
                doctor == null ? null : doctor.getDoctorName(),
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
                items
        );
    }

    private SaasPaymentReceiptResponse toReceiptResponse(SaasPaymentReceipt receipt) {
        return new SaasPaymentReceiptResponse(
                receipt.getId(),
                receipt.getTenantId(),
                receipt.getInvoiceId(),
                receipt.getReceiptNumber(),
                receipt.getPaidAmount(),
                receipt.getPaymentMode().name(),
                receipt.getTransactionId(),
                receipt.getRemarks(),
                receipt.getReceiptDateTime()
        );
    }
}