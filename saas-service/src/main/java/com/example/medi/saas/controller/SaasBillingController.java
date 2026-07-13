package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasInvoiceRequest;
import com.example.medi.saas.dto.SaasInvoiceResponse;
import com.example.medi.saas.dto.SaasPaymentReceiptResponse;
import com.example.medi.saas.service.SaasBillingService;
import com.example.medi.saas.service.SaasInvoicePdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/saas/billing")
public class SaasBillingController {

    private final SaasBillingService billingService;
    private final SaasInvoicePdfService pdfService;

    public SaasBillingController(
            SaasBillingService billingService,
            SaasInvoicePdfService pdfService
    ) {
        this.billingService = billingService;
        this.pdfService = pdfService;
    }

    @PostMapping("/invoices")
    public SaasInvoiceResponse createInvoice(@RequestBody SaasInvoiceRequest request) {
        return billingService.createInvoice(request);
    }

    @GetMapping("/invoices")
    public List<SaasInvoiceResponse> getInvoices(@RequestParam Long tenantId) {
        return billingService.getInvoices(tenantId);
    }

    @GetMapping("/invoices/{invoiceId}")
    public SaasInvoiceResponse getInvoice(
            @PathVariable Long invoiceId,
            @RequestParam Long tenantId
    ) {
        return billingService.getInvoice(tenantId, invoiceId);
    }

    @GetMapping("/invoices/patient")
    public List<SaasInvoiceResponse> getPatientInvoices(
            @RequestParam Long tenantId,
            @RequestParam Long patientId
    ) {
        return billingService.getPatientInvoices(tenantId, patientId);
    }

    @GetMapping("/invoices/ipd")
    public List<SaasInvoiceResponse> getIpdInvoices(
            @RequestParam Long tenantId,
            @RequestParam Long admissionId
    ) {
        return billingService.getIpdInvoices(tenantId, admissionId);
    }

    @PostMapping("/invoices/ipd-final")
    public SaasInvoiceResponse createIpdFinalInvoice(
            @RequestParam Long tenantId,
            @RequestParam Long admissionId
    ) {
        return billingService.createIpdFinalInvoice(tenantId, admissionId);
    }

    @PutMapping("/invoices/{invoiceId}/payment")
    public SaasInvoiceResponse updatePayment(
            @PathVariable Long invoiceId,
            @RequestParam Long tenantId,
            @RequestParam String paymentStatus,
            @RequestParam String paymentMode,
            @RequestParam(required = false) BigDecimal paidAmount,
            @RequestParam(required = false) String transactionId
    ) {
        return billingService.updatePayment(
                tenantId,
                invoiceId,
                paymentStatus,
                paymentMode,
                paidAmount,
                transactionId
        );
    }

    @GetMapping("/invoices/{invoiceId}/receipts")
    public List<SaasPaymentReceiptResponse> getReceipts(
            @PathVariable Long invoiceId,
            @RequestParam Long tenantId
    ) {
        return billingService.getReceipts(tenantId, invoiceId);
    }

    @GetMapping("/invoices/{invoiceId}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(
            @PathVariable Long invoiceId,
            @RequestParam Long tenantId
    ) {
        byte[] pdf = pdfService.generateInvoicePdf(tenantId, invoiceId);

        String filename = "saas-invoice-" + invoiceId + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}