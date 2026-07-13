package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasDiagnosticPdfService;
import com.example.medi.saas.service.SaasDiagnosticService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/diagnostics")
public class SaasDiagnosticController {

    private final SaasDiagnosticService diagnosticService;
    private final SaasDiagnosticPdfService pdfService;

    public SaasDiagnosticController(
            SaasDiagnosticService diagnosticService,
            SaasDiagnosticPdfService pdfService
    ) {
        this.diagnosticService = diagnosticService;
        this.pdfService = pdfService;
    }

    @PostMapping("/tests")
    public SaasDiagnosticTestResponse createTest(@RequestBody SaasDiagnosticTestRequest request) {
        return diagnosticService.createTest(request);
    }

    @GetMapping("/tests")
    public List<SaasDiagnosticTestResponse> getTests(
            @RequestParam Long tenantId,
            @RequestParam String type
    ) {
        return diagnosticService.getTests(tenantId, type);
    }

    @PostMapping("/orders")
    public SaasDiagnosticOrderResponse createOrder(@RequestBody SaasDiagnosticOrderRequest request) {
        return diagnosticService.createOrder(request);
    }

    @GetMapping("/orders")
    public List<SaasDiagnosticOrderResponse> getOrders(
            @RequestParam Long tenantId,
            @RequestParam(required = false) String type
    ) {
        return diagnosticService.getOrders(tenantId, type);
    }

    @GetMapping("/orders/{orderId}")
    public SaasDiagnosticOrderResponse getOrder(
            @PathVariable Long orderId,
            @RequestParam Long tenantId
    ) {
        return diagnosticService.getOrder(tenantId, orderId);
    }

    @GetMapping("/orders/patient")
    public List<SaasDiagnosticOrderResponse> getPatientOrders(
            @RequestParam Long tenantId,
            @RequestParam Long patientId
    ) {
        return diagnosticService.getPatientOrders(tenantId, patientId);
    }

    @GetMapping("/orders/doctor")
    public List<SaasDiagnosticOrderResponse> getDoctorOrders(
            @RequestParam Long tenantId,
            @RequestParam Long doctorProfileId
    ) {
        return diagnosticService.getDoctorOrders(tenantId, doctorProfileId);
    }

    @PutMapping("/orders/{orderId}/status")
    public SaasDiagnosticOrderResponse updateStatus(
            @PathVariable Long orderId,
            @RequestParam Long tenantId,
            @RequestParam String status
    ) {
        return diagnosticService.updateStatus(tenantId, orderId, status);
    }

    @PutMapping("/orders/{orderId}/result")
    public SaasDiagnosticOrderResponse updateResult(
            @PathVariable Long orderId,
            @RequestBody SaasDiagnosticResultRequest request
    ) {
        return diagnosticService.updateResult(orderId, request);
    }

    @PostMapping("/orders/{orderId}/invoice")
    public SaasInvoiceResponse createInvoice(
            @PathVariable Long orderId,
            @RequestParam Long tenantId
    ) {
        return diagnosticService.createInvoice(tenantId, orderId);
    }

    @GetMapping("/orders/{orderId}/pdf")
    public ResponseEntity<byte[]> downloadReportPdf(
            @PathVariable Long orderId,
            @RequestParam Long tenantId
    ) {
        byte[] pdf = pdfService.generateReportPdf(tenantId, orderId);

        String filename = "diagnostic-report-" + orderId + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}