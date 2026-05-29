package com.example.medi.billing.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.medi.billing.entity.Invoice;
import com.example.medi.billing.service.BillingService;
import com.example.medi.billing.service.InvoicePdfService;

import jakarta.ws.rs.core.HttpHeaders;

@RestController
@RequestMapping("/billing")
public class BillingController {

    private final BillingService billingService;
    
    private final InvoicePdfService invoicePdfService;

    public BillingController(BillingService billingService ,InvoicePdfService invoicePdfService) {
        this.billingService = billingService;
        this.invoicePdfService = invoicePdfService;
    }

    @PostMapping("/invoice/order/{orderId}")
    public Invoice generateInvoice(@PathVariable Long orderId) {
        return billingService.generateInvoice(orderId);
    }

    @GetMapping("/invoice/order/{orderId}")
    public Invoice getInvoiceByOrderId(@PathVariable Long orderId) {
        return billingService.getInvoiceByOrderId(orderId);
    }
    
    @GetMapping("/invoice/order/{orderId}/download")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable Long orderId) {

        Invoice invoice = billingService.getInvoiceByOrderId(orderId);

        byte[] pdf = invoicePdfService.generateInvoicePdf(invoice);

        String fileName = "invoice-" + invoice.getInvoiceNumber() + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
