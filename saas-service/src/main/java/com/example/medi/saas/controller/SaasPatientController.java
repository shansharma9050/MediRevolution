package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatientRequest;
import com.example.medi.saas.dto.SaasPatientResponse;
import com.example.medi.saas.service.SaasPatientService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/patients")
public class SaasPatientController {

    private final SaasPatientService patientService;

    public SaasPatientController(SaasPatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public SaasPatientResponse createPatient(@RequestBody SaasPatientRequest request) {
        return patientService.createPatient(request);
    }

    @GetMapping
    public List<SaasPatientResponse> getPatients(@RequestParam Long tenantId) {
        return patientService.getPatients(tenantId);
    }

    @GetMapping("/{patientId}")
    public SaasPatientResponse getPatient(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {
        return patientService.getPatient(tenantId, patientId);
    }

    @GetMapping("/search")
    public List<SaasPatientResponse> searchPatients(
            @RequestParam Long tenantId,
            @RequestParam(required = false) String keyword
    ) {
        return patientService.searchPatients(tenantId, keyword);
    }

    @PutMapping("/{patientId}")
    public SaasPatientResponse updatePatient(
            @PathVariable Long patientId,
            @RequestParam Long tenantId,
            @RequestBody SaasPatientRequest request
    ) {
        return patientService.updatePatient(tenantId, patientId, request);
    }

    @DeleteMapping("/{patientId}")
    public ApiResponse deletePatient(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {
        return patientService.deletePatient(tenantId, patientId);
    }
}