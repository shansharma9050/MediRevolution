package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasPatientMergeRequest;
import com.example.medi.saas.dto.SaasPatientMergeResponse;
import com.example.medi.saas.service.SaasPatientMergeService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/patient-merges")
public class SaasPatientMergeController {

    private final SaasPatientMergeService mergeService;


    public SaasPatientMergeController(
            SaasPatientMergeService mergeService
    ) {

        this.mergeService =
                mergeService;
    }


    @PostMapping
    public SaasPatientMergeResponse mergePatients(
            @RequestBody SaasPatientMergeRequest request
    ) {

        return mergeService.mergePatients(
                request
        );
    }


    @PostMapping("/{mergeId}/unmerge")
    public SaasPatientMergeResponse unmerge(
            @PathVariable Long mergeId,
            @RequestParam Long tenantId
    ) {

        return mergeService.unmerge(
                tenantId,
                mergeId
        );
    }


    @GetMapping("/patient/{patientId}")
    public List<SaasPatientMergeResponse> getPatientMergeHistory(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {

        return mergeService.getPatientMergeHistory(
                tenantId,
                patientId
        );
    }
}