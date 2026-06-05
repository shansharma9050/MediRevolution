package com.example.medi.doctor.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.doctor.dto.AvailableSlotResponse;
import com.example.medi.doctor.dto.BookDoctorAppointmentRequest;
import com.example.medi.doctor.entity.Appointment;
import com.example.medi.doctor.entity.DoctorAvailability;
import com.example.medi.doctor.entity.Patient;
import com.example.medi.doctor.entity.Prescription;
import com.example.medi.doctor.enums.AppointmentStatus;
import com.example.medi.doctor.repository.AppointmentRepository;
import com.example.medi.doctor.repository.DoctorAvailabilityRepository;
import com.example.medi.doctor.repository.PatientRepository;
import com.example.medi.doctor.repository.PrescriptionRepository;
import com.example.medi.doctor.security.CurrentUserUtil;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class DoctorService {

    private final PatientRepository patientRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorAvailabilityRepository availabilityRepository;

    public DoctorService(
            PatientRepository patientRepository,
            PrescriptionRepository prescriptionRepository,
            AppointmentRepository appointmentRepository,
            DoctorAvailabilityRepository availabilityRepository
    ) {
        this.patientRepository = patientRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.appointmentRepository = appointmentRepository;
        this.availabilityRepository = availabilityRepository;
    }

    private void allowDoctorOnly() {
        if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only DOCTOR can access this module");
        }
    }

    public Patient createPatient(Patient patient) {
        allowDoctorOnly();
        patient.setDoctorAuthUserId(CurrentUserUtil.getUserId());
        return patientRepository.save(patient);
    }

    public List<Patient> getMyPatients() {
        allowDoctorOnly();
        return patientRepository.findByDoctorAuthUserId(CurrentUserUtil.getUserId());
    }

    public Prescription createPrescription(Long patientId, Prescription prescription) {
        allowDoctorOnly();

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        if (!patient.getDoctorAuthUserId().equals(CurrentUserUtil.getUserId())) {
            throw new AccessDeniedException("You can prescribe only for your patients");
        }

        prescription.setDoctorAuthUserId(CurrentUserUtil.getUserId());
        prescription.setPatient(patient);

        return prescriptionRepository.save(prescription);
    }

    public List<Prescription> getMyPrescriptions() {
        allowDoctorOnly();
        return prescriptionRepository.findByDoctorAuthUserId(CurrentUserUtil.getUserId());
    }

    public List<Appointment> getMyAppointments() {
        allowDoctorOnly();
        return appointmentRepository.findByDoctorAuthUserId(CurrentUserUtil.getUserId());
    }
    
    public DoctorAvailability createAvailability(DoctorAvailability availability) {

        if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only DOCTOR can create availability");
        }

        if (availability.getAvailableDate() == null) {
            throw new RuntimeException("Available date is required");
        }

        if (availability.getStartTime() == null || availability.getEndTime() == null) {
            throw new RuntimeException("Start time and end time are required");
        }

        if (availability.getSlotDuration() == null || availability.getSlotDuration() <= 0) {
            throw new RuntimeException("Slot duration must be greater than zero");
        }

        if (!availability.getEndTime().isAfter(availability.getStartTime())) {
            throw new RuntimeException("End time must be after start time");
        }

        availability.setDoctorAuthUserId(CurrentUserUtil.getUserId());

        return availabilityRepository.save(availability);
    }
    
    public List<DoctorAvailability> getMyAvailability() {

        if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only DOCTOR can view availability");
        }

        return availabilityRepository.findByDoctorAuthUserId(CurrentUserUtil.getUserId());
    }
    
    public List<AvailableSlotResponse> getAvailableSlots(Long doctorId, LocalDate date) {

        List<DoctorAvailability> availabilityList =
                availabilityRepository.findByDoctorAuthUserIdAndAvailableDate(doctorId, date);

        List<AvailableSlotResponse> slots = new ArrayList<>();

        for (DoctorAvailability availability : availabilityList) {

            LocalTime current = availability.getStartTime();

            while (current.plusMinutes(availability.getSlotDuration()).compareTo(availability.getEndTime()) <= 0) {

                boolean booked = appointmentRepository
                        .existsByDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
                                doctorId,
                                date,
                                current,
                                AppointmentStatus.CANCELLED
                        );

                slots.add(new AvailableSlotResponse(current.toString(), booked));

                current = current.plusMinutes(availability.getSlotDuration());
            }
        }

        return slots;
    }
    
    public Appointment bookAppointment(BookDoctorAppointmentRequest request) {

    	if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
    	    throw new AccessDeniedException("Only PATIENT can book doctor appointment");
    	}
    	
        if (request.getDoctorAuthUserId() == null) {
            throw new RuntimeException("Doctor id is required");
        }

        if (request.getAppointmentDate() == null || request.getAppointmentTime() == null) {
            throw new RuntimeException("Appointment date and time are required");
        }

        boolean booked = appointmentRepository
                .existsByDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
                        request.getDoctorAuthUserId(),
                        request.getAppointmentDate(),
                        request.getAppointmentTime(),
                        AppointmentStatus.CANCELLED
                );

        if (booked) {
            throw new RuntimeException("Selected slot is already booked");
        }

        List<AvailableSlotResponse> slots =
                getAvailableSlots(request.getDoctorAuthUserId(), request.getAppointmentDate());

        boolean validSlot = slots.stream()
                .anyMatch(slot -> slot.getTime().equals(request.getAppointmentTime().toString()) && !slot.isBooked());

        if (!validSlot) {
            throw new RuntimeException("Selected slot is not available");
        }

        Appointment appointment = new Appointment();
        appointment.setDoctorAuthUserId(request.getDoctorAuthUserId());
        appointment.setPatientAuthUserId(CurrentUserUtil.getUserId());
        appointment.setPatientName(request.getPatientName());
        appointment.setPatientMobile(request.getPatientMobile());
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setSymptoms(request.getSymptoms());
        appointment.setStatus(AppointmentStatus.PENDING);

        return appointmentRepository.save(appointment);
    }
    
    public List<Appointment> getDoctorAppointments() {

        if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only DOCTOR can view doctor appointments");
        }

        return appointmentRepository
                .findByDoctorAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(CurrentUserUtil.getUserId());
    }
    
    public List<Appointment> getPatientAppointments() {
    	
    	if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
    	    throw new AccessDeniedException("Only PATIENT can view own appointment");
    	}

        return appointmentRepository
                .findByPatientAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(CurrentUserUtil.getUserId());
    }
    
    public Appointment updateAppointmentStatus(Long appointmentId, AppointmentStatus status) {

        if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only DOCTOR can update appointment status");
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getDoctorAuthUserId().equals(CurrentUserUtil.getUserId())) {
            throw new AccessDeniedException("You can update only your appointments");
        }

        appointment.setStatus(status);

        if (status == AppointmentStatus.CONFIRMED && appointment.getMeetingUrl() == null) {
            appointment.setMeetingUrl("Google Meet link will be generated in Phase 2");
        }

        return appointmentRepository.save(appointment);
    }
    
    public Appointment cancelPatientAppointment(Long appointmentId) {
    	
    	if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
    	    throw new AccessDeniedException("Only PATIENT can cancel appointment");
    	}

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getPatientAuthUserId().equals(CurrentUserUtil.getUserId())) {
            throw new AccessDeniedException("You can cancel only your appointment");
        }

        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Completed appointment cannot be cancelled");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);

        return appointmentRepository.save(appointment);
    }
}