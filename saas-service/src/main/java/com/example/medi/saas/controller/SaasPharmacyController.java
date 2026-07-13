package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasPharmacySaleRequest;
import com.example.medi.saas.dto.SaasPharmacySaleResponse;
import com.example.medi.saas.service.SaasPharmacyService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/pharmacy")
public class SaasPharmacyController {

    private final SaasPharmacyService pharmacyService;

    public SaasPharmacyController(SaasPharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @PostMapping("/sales")
    public SaasPharmacySaleResponse createSale(@RequestBody SaasPharmacySaleRequest request) {
        return pharmacyService.createSale(request);
    }

    @GetMapping("/sales")
    public List<SaasPharmacySaleResponse> getSales(@RequestParam Long tenantId) {
        return pharmacyService.getSales(tenantId);
    }

    @GetMapping("/sales/{saleId}")
    public SaasPharmacySaleResponse getSale(
            @PathVariable Long saleId,
            @RequestParam Long tenantId
    ) {
        return pharmacyService.getSale(tenantId, saleId);
    }

    @GetMapping("/sales/patient")
    public List<SaasPharmacySaleResponse> getPatientSales(
            @RequestParam Long tenantId,
            @RequestParam Long patientId
    ) {
        return pharmacyService.getPatientSales(tenantId, patientId);
    }
}