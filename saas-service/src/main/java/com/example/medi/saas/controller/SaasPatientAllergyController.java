package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatientAllergyRequest;
import com.example.medi.saas.dto.SaasPatientAllergyResponse;
import com.example.medi.saas.service.SaasPatientAllergyService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/patient-allergies")
public class SaasPatientAllergyController {

    private final SaasPatientAllergyService allergyService;


    public SaasPatientAllergyController(
            SaasPatientAllergyService allergyService
    ) {

        this.allergyService =
                allergyService;
    }


    @PostMapping
    public SaasPatientAllergyResponse createAllergy(
            @RequestBody SaasPatientAllergyRequest request
    ) {

        return allergyService.createAllergy(
                request
        );
    }


    @GetMapping("/patient/{patientId}")
    public List<SaasPatientAllergyResponse> getPatientAllergies(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {

        return allergyService.getPatientAllergies(
                tenantId,
                patientId
        );
    }


    @GetMapping("/{allergyId}")
    public SaasPatientAllergyResponse getAllergy(
            @PathVariable Long allergyId,
            @RequestParam Long tenantId
    ) {

        return allergyService.getAllergy(
                tenantId,
                allergyId
        );
    }


    @PutMapping("/{allergyId}")
    public SaasPatientAllergyResponse updateAllergy(
            @PathVariable Long allergyId,
            @RequestParam Long tenantId,
            @RequestBody SaasPatientAllergyRequest request
    ) {

        return allergyService.updateAllergy(
                tenantId,
                allergyId,
                request
        );
    }


    @DeleteMapping("/{allergyId}")
    public ApiResponse deleteAllergy(
            @PathVariable Long allergyId,
            @RequestParam Long tenantId
    ) {

        return allergyService.deleteAllergy(
                tenantId,
                allergyId
        );
    }
}