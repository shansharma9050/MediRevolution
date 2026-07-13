package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasOpdVisitRequest;
import com.example.medi.saas.dto.SaasOpdVisitResponse;
import com.example.medi.saas.service.SaasOpdService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/opd")
public class SaasOpdController {

    private final SaasOpdService opdService;

    public SaasOpdController(SaasOpdService opdService) {
        this.opdService = opdService;
    }

    @PostMapping
    public SaasOpdVisitResponse createOpdVisit(@RequestBody SaasOpdVisitRequest request) {
        return opdService.createOpdVisit(request);
    }

    @GetMapping
    public List<SaasOpdVisitResponse> getOpdVisits(@RequestParam Long tenantId) {
        return opdService.getOpdVisits(tenantId);
    }

    @GetMapping("/patient")
    public List<SaasOpdVisitResponse> getPatientOpdHistory(
            @RequestParam Long tenantId,
            @RequestParam Long patientId
    ) {
        return opdService.getPatientOpdHistory(tenantId, patientId);
    }

    @GetMapping("/doctor")
    public List<SaasOpdVisitResponse> getDoctorOpdVisits(
            @RequestParam Long tenantId,
            @RequestParam Long doctorProfileId
    ) {
        return opdService.getDoctorOpdVisits(tenantId, doctorProfileId);
    }

    @PutMapping("/{opdId}/complete")
    public SaasOpdVisitResponse completeOpd(
            @PathVariable Long opdId,
            @RequestParam Long tenantId
    ) {
        return opdService.completeOpd(tenantId, opdId);
    }

    @DeleteMapping("/{opdId}")
    public ApiResponse cancelOpd(
            @PathVariable Long opdId,
            @RequestParam Long tenantId
    ) {
        return opdService.cancelOpd(tenantId, opdId);
    }
}