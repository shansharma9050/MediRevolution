package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasStaffRequest;
import com.example.medi.saas.dto.SaasStaffResponse;
import com.example.medi.saas.security.CurrentUserUtil;
import com.example.medi.saas.service.SaasStaffService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/staff")
public class SaasStaffController {

    private final SaasStaffService staffService;

    public SaasStaffController(SaasStaffService staffService) {
        this.staffService = staffService;
    }

    @PostMapping
    public SaasStaffResponse createStaff(@RequestBody SaasStaffRequest request) {
        return staffService.createStaff(request);
    }

    @GetMapping
    public List<SaasStaffResponse> getStaff(@RequestParam Long tenantId) {
        return staffService.getStaff(tenantId);
    }

    /*
     * This is now the main doctor list endpoint.
     * Appointment booking and doctor availability should use this.
     */
    @GetMapping("/doctors")
    public List<SaasStaffResponse> getDoctorsAsStaff(@RequestParam Long tenantId) {
        return staffService.getDoctorsAsStaff(tenantId);
    }

    @GetMapping("/{staffId}")
    public SaasStaffResponse getStaffById(
            @PathVariable Long staffId,
            @RequestParam Long tenantId
    ) {
        return staffService.getStaffById(tenantId, staffId);
    }

    @GetMapping("/search")
    public List<SaasStaffResponse> searchStaff(
            @RequestParam Long tenantId,
            @RequestParam(required = false) String keyword
    ) {
        return staffService.searchStaff(tenantId, keyword);
    }

    @PutMapping("/{staffId}")
    public SaasStaffResponse updateStaff(
            @PathVariable Long staffId,
            @RequestParam Long tenantId,
            @RequestBody SaasStaffRequest request
    ) {
        return staffService.updateStaff(tenantId, staffId, request);
    }

    @DeleteMapping("/{staffId}")
    public ApiResponse deleteStaff(
            @PathVariable Long staffId,
            @RequestParam Long tenantId
    ) {
        return staffService.deleteStaff(tenantId, staffId);
    }
    
    @GetMapping("/doctors/for-appointments")
    public List<SaasStaffResponse> getDoctorsForAppointments(
            @RequestParam Long tenantId
    ) {
        return staffService.getDoctorsForAppointments(tenantId);
    }
    
    @GetMapping("/doctors/for-clinical")
    public List<SaasStaffResponse> getDoctorsForClinical(
            @RequestParam Long tenantId
    ) {

        return staffService.getDoctorsForClinical(tenantId);
    }
}