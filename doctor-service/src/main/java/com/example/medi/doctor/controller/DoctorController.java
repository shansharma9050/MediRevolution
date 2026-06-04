package com.example.medi.doctor.controller;

import org.springframework.web.bind.annotation.*;

import com.example.medi.doctor.dto.AvailableSlotResponse;
import com.example.medi.doctor.dto.BookDoctorAppointmentRequest;
import com.example.medi.doctor.entity.Appointment;
import com.example.medi.doctor.entity.DoctorAvailability;
import com.example.medi.doctor.entity.Patient;
import com.example.medi.doctor.entity.Prescription;
import com.example.medi.doctor.enums.AppointmentStatus;
import com.example.medi.doctor.service.DoctorService;

import java.time.LocalDate;
import java.util.List;

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
}