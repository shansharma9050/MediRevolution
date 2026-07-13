package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasIpdService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/ipd")
public class SaasIpdController {

    private final SaasIpdService ipdService;

    public SaasIpdController(SaasIpdService ipdService) {
        this.ipdService = ipdService;
    }

    @PostMapping("/wards")
    public SaasWardResponse createWard(@RequestBody SaasWardRequest request) {
        return ipdService.createWard(request);
    }

    @GetMapping("/wards")
    public List<SaasWardResponse> getWards(@RequestParam Long tenantId) {
        return ipdService.getWards(tenantId);
    }

    @PostMapping("/beds")
    public SaasBedResponse createBed(@RequestBody SaasBedRequest request) {
        return ipdService.createBed(request);
    }

    @GetMapping("/beds")
    public List<SaasBedResponse> getBeds(@RequestParam Long tenantId) {
        return ipdService.getBeds(tenantId);
    }

    @GetMapping("/beds/available")
    public List<SaasBedResponse> getAvailableBeds(@RequestParam Long tenantId) {
        return ipdService.getAvailableBeds(tenantId);
    }

    @PostMapping("/admissions")
    public SaasIpdAdmissionResponse admitPatient(@RequestBody SaasIpdAdmissionRequest request) {
        return ipdService.admitPatient(request);
    }

    @GetMapping("/admissions")
    public List<SaasIpdAdmissionResponse> getAdmissions(@RequestParam Long tenantId) {
        return ipdService.getAdmissions(tenantId);
    }

    @GetMapping("/admissions/{admissionId}")
    public SaasIpdAdmissionResponse getAdmission(
            @PathVariable Long admissionId,
            @RequestParam Long tenantId
    ) {
        return ipdService.getAdmission(tenantId, admissionId);
    }

    @GetMapping("/admissions/patient")
    public List<SaasIpdAdmissionResponse> getPatientIpdHistory(
            @RequestParam Long tenantId,
            @RequestParam Long patientId
    ) {
        return ipdService.getPatientIpdHistory(tenantId, patientId);
    }

    @PutMapping("/admissions/{admissionId}/discharge")
    public SaasIpdAdmissionResponse dischargePatient(
            @PathVariable Long admissionId,
            @RequestBody SaasIpdDischargeRequest request
    ) {
        return ipdService.dischargePatient(admissionId, request);
    }

    @PostMapping("/daily-notes")
    public SaasIpdDailyNoteResponse addDailyNote(@RequestBody SaasIpdDailyNoteRequest request) {
        return ipdService.addDailyNote(request);
    }

    @GetMapping("/daily-notes")
    public List<SaasIpdDailyNoteResponse> getDailyNotes(
            @RequestParam Long tenantId,
            @RequestParam Long admissionId
    ) {
        return ipdService.getDailyNotes(tenantId, admissionId);
    }

    @PostMapping("/charges")
    public SaasIpdChargeResponse addCharge(@RequestBody SaasIpdChargeRequest request) {
        return ipdService.addCharge(request);
    }

    @GetMapping("/charges")
    public List<SaasIpdChargeResponse> getCharges(
            @RequestParam Long tenantId,
            @RequestParam Long admissionId
    ) {
        return ipdService.getCharges(tenantId, admissionId);
    }
}