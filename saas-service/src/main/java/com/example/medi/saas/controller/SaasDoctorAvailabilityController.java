package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasDoctorAvailabilityRequest;
import com.example.medi.saas.dto.SaasDoctorAvailabilityResponse;
import com.example.medi.saas.dto.SaasDoctorSlotResponse;
import com.example.medi.saas.service.SaasDoctorAvailabilityService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/saas/doctor-availability")
public class SaasDoctorAvailabilityController {

    private final SaasDoctorAvailabilityService availabilityService;

    public SaasDoctorAvailabilityController(SaasDoctorAvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

   
    @PostMapping
    public SaasDoctorAvailabilityResponse createAvailability(
            @RequestBody SaasDoctorAvailabilityRequest request
    ) {
        return availabilityService.createAvailability(request);
    }

    @GetMapping
    public List<SaasDoctorAvailabilityResponse> getAvailability(
            @RequestParam Long tenantId,

            @RequestParam(required = false) Long doctorAuthUserId,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return availabilityService.getAvailability(
                tenantId,
                doctorAuthUserId,
                date
        );
    }

    @GetMapping("/slots")
    public List<SaasDoctorSlotResponse> getAvailableSlots(
            @RequestParam Long tenantId,

            @RequestParam Long doctorAuthUserId,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return availabilityService.getAvailableSlots(
                tenantId,
                doctorAuthUserId,
                date
        );
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteAvailability(
            @PathVariable Long id,
            @RequestParam Long tenantId
    ) {
        availabilityService.deleteAvailability(tenantId, id);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Doctor availability deleted successfully.");
        response.put("availabilityId", id);
        return response;
    }
}