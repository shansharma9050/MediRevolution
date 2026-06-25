package com.example.medi.hospital.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.medi.hospital.dto.BookHospitalAppointmentRequest;
import com.example.medi.hospital.dto.HospitalAvailableSlotResponse;
import com.example.medi.hospital.dto.HospitalDashboardResponse;
import com.example.medi.hospital.entity.HospitalAppointment;
import com.example.medi.hospital.entity.HospitalBill;
import com.example.medi.hospital.entity.HospitalDoctor;
import com.example.medi.hospital.entity.HospitalDoctorAvailability;
import com.example.medi.hospital.entity.HospitalInventory;
import com.example.medi.hospital.entity.HospitalPatient;
import com.example.medi.hospital.entity.Staff;
import com.example.medi.hospital.enums.HospitalAppointmentStatus;
import com.example.medi.hospital.service.HospitalManagementService;

@RestController
@RequestMapping("/hospital")
public class HospitalController {

    public final HospitalManagementService service;

    public HospitalController(HospitalManagementService service) {
        this.service = service;
    }

    @PostMapping("/patients")
    public HospitalPatient createPatient(@RequestBody HospitalPatient patient) {
        return service.createPatient(patient);
    }

    @GetMapping("/patients")
    public List<HospitalPatient> getPatients() {
        return service.getPatients();
    }

    @PostMapping("/staff")
    public Staff createStaff(@RequestBody Staff staff) {
        return service.createStaff(staff);
    }

    @GetMapping("/staff")
    public List<Staff> getStaff() {
        return service.getStaff();
    }

    @PostMapping("/inventory")
    public HospitalInventory createInventory(@RequestBody HospitalInventory inventory) {
        return service.createInventory(inventory);
    }

    @GetMapping("/inventory")
    public List<HospitalInventory> getInventory() {
        return service.getInventory();
    }

    @PostMapping("/patients/{patientId}/bill")
    public HospitalBill createBill(@PathVariable Long patientId, @RequestBody HospitalBill bill) {
        return service.createBill(patientId, bill);
    }

    @GetMapping("/bills")
    public List<HospitalBill> getBills() {
        return service.getBills();
    }

    @GetMapping("/dashboard-counts")
    public HospitalDashboardResponse getDashboardCounts() {
        return service.getDashboardCounts();
    }

    @PutMapping("/inventory/{id}")
    public HospitalInventory updateInventory(@PathVariable Long id, @RequestBody HospitalInventory inventory) {
        return service.updateInventory(id, inventory);
    }

    @PutMapping("/inventory/{id}/use")
    public HospitalInventory useInventoryItem(@PathVariable Long id, @RequestParam Integer quantity) {
        return service.useInventoryItem(id, quantity);
    }

    @PutMapping("/bills/{billId}/paid")
    public HospitalBill markBillPaid(@PathVariable Long billId) {
        return service.markBillPaid(billId);
    }

    @PutMapping("/patients/{id}")
    public HospitalPatient updatePatient(@PathVariable Long id, @RequestBody HospitalPatient patient) {
        return service.updatePatient(id, patient);
    }

    @DeleteMapping("/patients/{id}")
    public String deletePatient(@PathVariable Long id) {
        service.deletePatient(id);
        return "Patient deleted successfully";
    }

    @PutMapping("/staff/{id}")
    public Staff updateStaff(@PathVariable Long id, @RequestBody Staff staff) {
        return service.updateStaff(id, staff);
    }

    @DeleteMapping("/staff/{id}")
    public String deleteStaff(@PathVariable Long id) {
        service.deleteStaff(id);
        return "Staff deleted successfully";
    }

    @DeleteMapping("/inventory/{id}")
    public String deleteInventory(@PathVariable Long id) {
        service.deleteInventory(id);
        return "Inventory item deleted successfully";
    }

    @PutMapping("/bills/{id}")
    public HospitalBill updateBill(@PathVariable Long id, @RequestBody HospitalBill bill) {
        return service.updateBill(id, bill);
    }

    @DeleteMapping("/bills/{id}")
    public String deleteBill(@PathVariable Long id) {
        service.deleteBill(id);
        return "Bill deleted successfully";
    }

    @PostMapping("/doctor-availability")
    public ResponseEntity<?> createDoctorAvailability(@RequestBody HospitalDoctorAvailability availability) {
        HospitalDoctorAvailability saved = service.createDoctorAvailability(availability);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/doctor-availability/my")
    public List<HospitalDoctorAvailability> getMyDoctorAvailability() {
        return service.getMyDoctorAvailability();
    }

    @GetMapping("/available-slots")
    public List<HospitalAvailableSlotResponse> getHospitalDoctorSlots(
            @RequestParam Long hospitalId,
            @RequestParam Long hospitalDoctorId,
            @RequestParam LocalDate date
    ) {
        return service.getHospitalDoctorSlots(hospitalId, hospitalDoctorId, date);
    }

    @PostMapping("/appointments/book")
    public HospitalAppointment bookHospitalAppointment(@RequestBody BookHospitalAppointmentRequest request) {
        return service.bookHospitalAppointment(request);
    }

    @GetMapping("/appointments/hospital")
    public List<HospitalAppointment> getHospitalAppointments() {
        return service.getHospitalAppointments();
    }

    @GetMapping("/appointments/patient")
    public List<HospitalAppointment> getPatientHospitalAppointments() {
        return service.getPatientHospitalAppointments();
    }

    @PutMapping("/appointments/{appointmentId}/status")
    public HospitalAppointment updateHospitalAppointmentStatus(
            @PathVariable Long appointmentId,
            @RequestParam HospitalAppointmentStatus status
    ) {
        return service.updateHospitalAppointmentStatus(appointmentId, status);
    }

    @PutMapping("/appointments/{appointmentId}/cancel")
    public HospitalAppointment cancelPatientHospitalAppointment(@PathVariable Long appointmentId) {
        return service.cancelPatientHospitalAppointment(appointmentId);
    }

    @PostMapping("/doctors")
    public HospitalDoctor createHospitalDoctor(@RequestBody HospitalDoctor doctor) {
        return service.createHospitalDoctor(doctor);
    }

    @GetMapping("/doctors/my")
    public List<HospitalDoctor> getMyHospitalDoctors() {
        return service.getMyHospitalDoctors();
    }

    @GetMapping("/hospital-doctors-public-list")
    public List<HospitalDoctor> getPublicHospitalDoctors() {
        return service.getPublicHospitalDoctors();
    }

    @GetMapping("/doctors/hospital/{hospitalId}")
    public List<HospitalDoctor> getDoctorsByHospital(@PathVariable Long hospitalId) {
        return service.getDoctorsByHospital(hospitalId);
    }

    @PutMapping("/doctors/{doctorId}")
    public HospitalDoctor updateHospitalDoctor(
            @PathVariable Long doctorId,
            @RequestBody HospitalDoctor doctor
    ) {
        return service.updateHospitalDoctor(doctorId, doctor);
    }

    @DeleteMapping("/doctors/{doctorId}")
    public String deleteHospitalDoctor(@PathVariable Long doctorId) {
        service.deleteHospitalDoctor(doctorId);
        return "Hospital doctor deleted successfully";
    }
    
    
}