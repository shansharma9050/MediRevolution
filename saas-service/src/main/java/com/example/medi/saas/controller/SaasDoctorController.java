package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasDoctorRequest;
import com.example.medi.saas.dto.SaasDoctorResponse;
import com.example.medi.saas.service.SaasDoctorService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/doctors")
public class SaasDoctorController {

    private final SaasDoctorService doctorService;

    public SaasDoctorController(SaasDoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @PostMapping
    public SaasDoctorResponse createDoctor(@RequestBody SaasDoctorRequest request) {
        return doctorService.createDoctor(request);
    }

    @GetMapping
    public List<SaasDoctorResponse> getDoctors(@RequestParam Long tenantId) {
        return doctorService.getDoctors(tenantId);
    }

    @GetMapping("/{doctorId}")
    public SaasDoctorResponse getDoctor(
            @PathVariable Long doctorId,
            @RequestParam Long tenantId
    ) {
        return doctorService.getDoctor(tenantId, doctorId);
    }

    @GetMapping("/department")
    public List<SaasDoctorResponse> getDoctorsByDepartment(
            @RequestParam Long tenantId,
            @RequestParam(required = false) String department
    ) {
        return doctorService.getDoctorsByDepartment(tenantId, department);
    }

    @PutMapping("/{doctorId}")
    public SaasDoctorResponse updateDoctor(
            @PathVariable Long doctorId,
            @RequestParam Long tenantId,
            @RequestBody SaasDoctorRequest request
    ) {
        return doctorService.updateDoctor(tenantId, doctorId, request);
    }

    @DeleteMapping("/{doctorId}")
    public ApiResponse deleteDoctor(
            @PathVariable Long doctorId,
            @RequestParam Long tenantId
    ) {
        return doctorService.deleteDoctor(tenantId, doctorId);
    }
}