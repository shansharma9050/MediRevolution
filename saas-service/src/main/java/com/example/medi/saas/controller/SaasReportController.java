package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasReportService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/saas/reports")
public class SaasReportController {

    private final SaasReportService reportService;

    public SaasReportController(SaasReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/dashboard")
    public SaasDashboardReportResponse dashboard(@RequestParam Long tenantId) {
        return reportService.dashboard(tenantId);
    }

    @GetMapping("/patients")
    public List<SaasPatientReportResponse> patientReport(@RequestParam Long tenantId) {
        return reportService.patientReport(tenantId);
    }

    @GetMapping("/appointments")
    public List<SaasAppointmentReportResponse> appointmentReport(
            @RequestParam Long tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        return reportService.appointmentReport(tenantId, fromDate, toDate);
    }

    @GetMapping("/opd")
    public List<SaasOpdReportResponse> opdReport(
            @RequestParam Long tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        return reportService.opdReport(tenantId, fromDate, toDate);
    }

    @GetMapping("/ipd")
    public List<SaasIpdReportResponse> ipdReport(
            @RequestParam Long tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        return reportService.ipdReport(tenantId, fromDate, toDate);
    }

    @GetMapping("/billing")
    public List<SaasBillingReportResponse> billingReport(
            @RequestParam Long tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        return reportService.billingReport(tenantId, fromDate, toDate);
    }

    @GetMapping("/pharmacy")
    public List<SaasPharmacyReportResponse> pharmacyReport(
            @RequestParam Long tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        return reportService.pharmacyReport(tenantId, fromDate, toDate);
    }

    @GetMapping("/inventory/low-stock")
    public List<SaasLowStockReportResponse> lowStockReport(@RequestParam Long tenantId) {
        return reportService.getLowStock(tenantId);
    }

    @GetMapping("/diagnostics")
    public List<SaasDiagnosticReportResponse> diagnosticReport(
            @RequestParam Long tenantId,
            @RequestParam String type,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
        return reportService.diagnosticReport(tenantId, type, fromDate, toDate);
    }
}