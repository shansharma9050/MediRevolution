package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatient360Response;
import com.example.medi.saas.dto.SaasPatientRequest;
import com.example.medi.saas.dto.SaasPatientResponse;
import com.example.medi.saas.service.SaasPatient360AssemblerService;
import com.example.medi.saas.service.SaasPatientSelfResolverService;
import com.example.medi.saas.service.SaasPatientService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/patients")
public class SaasPatientController {

    private final SaasPatientService patientService;

    private final SaasPatient360AssemblerService patient360AssemblerService;

    private final SaasPatientSelfResolverService patientSelfResolverService;


    public SaasPatientController(
            SaasPatientService patientService,
            SaasPatient360AssemblerService patient360AssemblerService,
            SaasPatientSelfResolverService patientSelfResolverService
    ) {

        this.patientService =
                patientService;

        this.patient360AssemblerService =
                patient360AssemblerService;

        this.patientSelfResolverService =
                patientSelfResolverService;
    }


    @PostMapping
    public SaasPatientResponse createPatient(
            @RequestHeader("Authorization")
            String authorization,

            @RequestBody
            SaasPatientRequest request
    ) {

        return patientService.createPatient(
                request,
                authorization
        );
    }


    @GetMapping
    public List<SaasPatientResponse> getPatients(
            @RequestParam Long tenantId
    ) {

        return patientService.getPatients(
                tenantId
        );
    }


    @GetMapping("/search")
    public List<SaasPatientResponse> searchPatients(
            @RequestParam Long tenantId,

            @RequestParam(required = false)
            String keyword
    ) {

        return patientService.searchPatients(
                tenantId,
                keyword
        );
    }


    /*
     * ================================================================
     * CURRENT PATIENT
     * ================================================================
     *
     * Supports both:
     * 1. direct active patient identity
     * 2. duplicate patient identity merged into a canonical patient
     */

    @GetMapping("/me")
    public SaasPatientResponse getMyPatient(
            @RequestParam Long tenantId
    ) {

        return patientSelfResolverService.getMyPatient(
                tenantId
        );
    }


    /*
     * ================================================================
     * PATIENT 360
     * ================================================================
     */

    @GetMapping("/{patientId}/360")
    public SaasPatient360Response getPatient360(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {

        return patient360AssemblerService.getPatient360(
                tenantId,
                patientId
        );
    }


    @GetMapping("/{patientId}")
    public SaasPatientResponse getPatient(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {

        return patientService.getPatient(
                tenantId,
                patientId
        );
    }


    @PutMapping("/{patientId}")
    public SaasPatientResponse updatePatient(
            @PathVariable Long patientId,

            @RequestParam Long tenantId,

            @RequestBody
            SaasPatientRequest request
    ) {

        return patientService.updatePatient(
                tenantId,
                patientId,
                request
        );
    }


    @DeleteMapping("/{patientId}")
    public ApiResponse deletePatient(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {

        return patientService.deletePatient(
                tenantId,
                patientId
        );
    }
}