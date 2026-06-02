package com.example.medi.billing.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.medi.billing.dto.InvoiceResponse;
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

    @PostMapping("/invoice/order/{orderNo}")
    public InvoiceResponse generateInvoice(@PathVariable String orderNo) {
        Invoice invoice = billingService.generateInvoice(orderNo);
        return billingService.mapToInvoiceResponse(invoice);
    }

    @GetMapping("/invoice/order/{orderNo}")
    public InvoiceResponse getInvoiceByOrderId(@PathVariable String orderNo) {
        Invoice invoice = billingService.getInvoiceByOrderId(orderNo);
        return billingService.mapToInvoiceResponse(invoice);
    }
    
    @GetMapping("/invoice/order/{orderNo}/download")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable String orderNo) {

        Invoice invoice = billingService.getInvoiceByOrderId(orderNo);

        byte[] pdf = invoicePdfService.generateInvoicePdf(invoice);

        String fileName = "invoice-" + invoice.getInvoiceNumber() + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
