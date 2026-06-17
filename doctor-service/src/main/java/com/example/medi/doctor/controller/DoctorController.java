package com.example.medi.doctor.controller;

import org.springframework.web.bind.annotation.*;

import com.example.medi.doctor.dto.AvailableSlotResponse;
import com.example.medi.doctor.dto.BookDoctorAppointmentRequest;
import com.example.medi.doctor.dto.UpdatePrescriptionRequest;
import com.example.medi.doctor.entity.Appointment;
import com.example.medi.doctor.entity.DoctorAvailability;
import com.example.medi.doctor.entity.Patient;
import com.example.medi.doctor.entity.Prescription;
import com.example.medi.doctor.enums.AppointmentStatus;
import com.example.medi.doctor.service.DoctorService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;

import com.example.medi.doctor.entity.Prescription;
import com.example.medi.doctor.security.AuthUser;

@RestController
@RequestMapping("/doctor")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @PostMapping("/patients")
    public Patient createPatient(@RequestBody Patient patient) {
        return doctorService.createPatient(patient);
    }

    @GetMapping("/patients")
    public List<Patient> getMyPatients() {
        return doctorService.getMyPatients();
    }

    @PutMapping("/patients/{patientId}")
    public Patient updatePatient(
            @PathVariable Long patientId,
            @RequestBody Patient patient
    ) {
        return doctorService.updatePatient(patientId, patient);
    }

    @DeleteMapping("/patients/{patientId}")
    public Map<String, String> deletePatient(@PathVariable Long patientId) {
        doctorService.deletePatient(patientId);
        return Map.of("message", "Patient deleted successfully");
    }
    
    @PostMapping("/patients/{patientId}/prescriptions")
    public Prescription createPrescription(
            @PathVariable Long patientId,
            @RequestBody Prescription prescription
    ) {
        return doctorService.createPrescription(patientId, prescription);
    }

    @GetMapping("/prescriptions")
    public List<Prescription> getMyPrescriptions() {
        return doctorService.getMyPrescriptions();
    }

    @GetMapping("/appointments")
    public List<Appointment> getMyAppointments() {
        return doctorService.getMyAppointments();
    }

    @PutMapping("/appointments/{appointmentId}/status")
    public Appointment updateAppointmentStatus(
            @PathVariable Long appointmentId,
            @RequestParam AppointmentStatus status
    ) {
        return doctorService.updateAppointmentStatus(appointmentId, status);
    }
    
    @PostMapping("/availability")
    public DoctorAvailability createAvailability(@RequestBody DoctorAvailability availability) {
        return doctorService.createAvailability(availability);
    }

    @GetMapping("/availability/my")
    public List<DoctorAvailability> getMyAvailability() {
        return doctorService.getMyAvailability();
    }

    @GetMapping("/available-slots/{doctorId}")
    public List<AvailableSlotResponse> getAvailableSlots(
            @PathVariable Long doctorId,
            @RequestParam LocalDate date
    ) {
        return doctorService.getAvailableSlots(doctorId, date);
    }

    @PostMapping("/appointments/book")
    public Appointment bookAppointment(@RequestBody BookDoctorAppointmentRequest request) {
        return doctorService.bookAppointment(request);
    }

    @GetMapping("/appointments/doctor")
    public List<Appointment> getDoctorAppointments() {
        return doctorService.getDoctorAppointments();
    }

    @GetMapping("/appointments/patient")
    public List<Appointment> getPatientAppointments() {
        return doctorService.getPatientAppointments();
    }

    @PutMapping("/appointments/{appointmentId}/cancel")
    public Appointment cancelPatientAppointment(@PathVariable Long appointmentId) {
        return doctorService.cancelPatientAppointment(appointmentId);
    }
    
    @GetMapping(value = "/prescriptions/{prescriptionId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadPrescriptionPdf(@PathVariable Long prescriptionId) {

        byte[] pdfBytes = doctorService.downloadPrescriptionPdf(prescriptionId);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=prescription-" + prescriptionId + ".pdf"
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
    
    @PutMapping("/prescriptions/{prescriptionId}")
    public ResponseEntity<?> updatePrescription(@PathVariable Long prescriptionId,
                                                @RequestBody UpdatePrescriptionRequest request) {
        try {
            Prescription updatedPrescription = doctorService.updatePrescription(
                    prescriptionId,
                    request
            );

            return ResponseEntity.ok(updatedPrescription);

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
    
    @GetMapping("/patient/my-prescriptions")
    public ResponseEntity<?> getMyPrescriptions(Authentication authentication) {
        try {
            AuthUser authUser = (AuthUser) authentication.getPrincipal();

            Long patientAuthUserId = authUser.getUserId();

            List<Prescription> prescriptions =
                    doctorService.getPrescriptionsForPatient(patientAuthUserId);

            return ResponseEntity.ok(prescriptions);

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
    
    @PostMapping("/payments/verify")
    public Appointment verifyPayment(
            @RequestParam Long appointmentId,
            @RequestParam String merchantOrderId
    ) {
        return doctorService.verifyAppointmentPayment(appointmentId, merchantOrderId);
    }
}