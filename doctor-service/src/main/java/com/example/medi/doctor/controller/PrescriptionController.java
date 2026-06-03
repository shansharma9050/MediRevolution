package com.example.medi.doctor.controller;

import org.springframework.web.bind.annotation.*;

import com.example.medi.doctor.entity.Prescription;
import com.example.medi.doctor.service.PrescriptionService;

import java.util.List;

@RestController
@RequestMapping("/doctor/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @PostMapping
    public Prescription createPrescription(@RequestBody Prescription prescription) {
        return prescriptionService.createPrescription(prescription);
    }

    @GetMapping("/my")
    public List<Prescription> getMyPrescriptions() {
        return prescriptionService.getMyPrescriptions();
    }

    @GetMapping("/{id}")
    public Prescription getPrescription(@PathVariable Long id) {
        return prescriptionService.getPrescription(id);
    }
}