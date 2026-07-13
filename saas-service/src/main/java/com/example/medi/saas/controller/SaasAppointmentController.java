package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasAppointmentRequest;
import com.example.medi.saas.dto.SaasAppointmentResponse;
import com.example.medi.saas.service.SaasAppointmentService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/appointments")
public class SaasAppointmentController {

    private final SaasAppointmentService appointmentService;

    public SaasAppointmentController(
            SaasAppointmentService appointmentService
    ) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public SaasAppointmentResponse createAppointment(
            @RequestBody SaasAppointmentRequest request
    ) {
    	System.out.println("====================================");
        System.out.println("CREATE APPOINTMENT CONTROLLER HIT");
        System.out.println("tenantId: " + request.getTenantId());
        System.out.println("patientId: " + request.getPatientId());
        System.out.println("doctorStaffId: " + request.getDoctorStaffId());
        System.out.println("====================================");
    	
        return appointmentService.createAppointment(request);
    }

    @GetMapping
    public List<SaasAppointmentResponse> getAppointments(
            @RequestParam Long tenantId
    ) {
        return appointmentService.getAppointments(tenantId);
    }

    @GetMapping("/{appointmentId}")
    public SaasAppointmentResponse getAppointment(
            @PathVariable Long appointmentId,
            @RequestParam Long tenantId
    ) {
        return appointmentService.getAppointment(
                tenantId,
                appointmentId
        );
    }

    @GetMapping("/doctor")
    public List<SaasAppointmentResponse> getDoctorAppointments(
            @RequestParam Long tenantId,
            @RequestParam Long doctorAuthUserId
    ) {
        return appointmentService.getDoctorAppointments(
                tenantId,
                doctorAuthUserId
        );
    }

    @GetMapping("/patient")
    public List<SaasAppointmentResponse> getPatientAppointments(
            @RequestParam Long tenantId,
            @RequestParam Long patientId
    ) {
        return appointmentService.getPatientAppointments(
                tenantId,
                patientId
        );
    }

    @PutMapping("/{appointmentId}")
    public SaasAppointmentResponse updateAppointment(
            @PathVariable Long appointmentId,
            @RequestParam Long tenantId,
            @RequestBody SaasAppointmentRequest request
    ) {
        return appointmentService.updateAppointment(
                tenantId,
                appointmentId,
                request
        );
    }

    @PutMapping("/{appointmentId}/status")
    public SaasAppointmentResponse updateStatus(
            @PathVariable Long appointmentId,
            @RequestParam Long tenantId,
            @RequestParam String status
    ) {
        return appointmentService.updateStatus(
                tenantId,
                appointmentId,
                status
        );
    }

    @DeleteMapping("/{appointmentId}")
    public ApiResponse cancelAppointment(
            @PathVariable Long appointmentId,
            @RequestParam Long tenantId
    ) {
        return appointmentService.cancelAppointment(
                tenantId,
                appointmentId
        );
    }
}