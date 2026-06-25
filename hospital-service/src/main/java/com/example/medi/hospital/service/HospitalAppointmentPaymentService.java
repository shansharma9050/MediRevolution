package com.example.medi.hospital.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.medi.hospital.dto.BookHospitalVideoAppointmentRequest;
import com.example.medi.hospital.dto.HospitalPaymentStartResponse;
import com.example.medi.hospital.dto.HospitalPaymentVerifyResponse;
import com.example.medi.hospital.entity.HospitalAppointment;
import com.example.medi.hospital.entity.HospitalDoctor;
import com.example.medi.hospital.enums.HospitalAppointmentStatus;
import com.example.medi.hospital.enums.HospitalConsultationType;
import com.example.medi.hospital.enums.HospitalPaymentStatus;
import com.example.medi.hospital.repository.HospitalAppointmentRepository;
import com.example.medi.hospital.repository.HospitalDoctorRepository;
import com.example.medi.hospital.security.CurrentUserUtil;

@Service
public class HospitalAppointmentPaymentService {

    private final HospitalAppointmentRepository appointmentRepository;
    private final HospitalDoctorRepository hospitalDoctorRepository;
    private final PhonePeHospitalService phonePeHospitalService;
    private final HospitalVideoMeetingService videoMeetingService;

    public HospitalAppointmentPaymentService(
            HospitalAppointmentRepository appointmentRepository,
            HospitalDoctorRepository hospitalDoctorRepository,
            PhonePeHospitalService phonePeHospitalService,
            HospitalVideoMeetingService videoMeetingService
    ) {
        this.appointmentRepository = appointmentRepository;
        this.hospitalDoctorRepository = hospitalDoctorRepository;
        this.phonePeHospitalService = phonePeHospitalService;
        this.videoMeetingService = videoMeetingService;
    }

    @Transactional
    public HospitalPaymentStartResponse bookVideoAppointmentAndStartPayment(
            BookHospitalVideoAppointmentRequest request
    ) {
        validateVideoAppointmentRequest(request);

        HospitalDoctor doctor = hospitalDoctorRepository.findById(request.getHospitalDoctorId())
                .orElseThrow(() -> new RuntimeException("Hospital doctor not found"));

        if (!doctor.getHospitalAuthUserId().equals(request.getHospitalAuthUserId())) {
            throw new RuntimeException("Selected doctor does not belong to selected hospital");
        }

        boolean alreadyBooked = appointmentRepository
                .existsByHospitalAuthUserIdAndHospitalDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
                        request.getHospitalAuthUserId(),
                        request.getHospitalDoctorId(),
                        request.getAppointmentDate(),
                        request.getAppointmentTime(),
                        HospitalAppointmentStatus.CANCELLED
                );

        if (alreadyBooked) {
            throw new RuntimeException("Selected slot is already booked");
        }

        Long consultationFeeRupees = doctor.getConsultationFee() == null
                ? 500L
                : doctor.getConsultationFee().longValue();

        Long amountInPaise = consultationFeeRupees * 100;

        String merchantOrderId = "MR-HOSP-APT-" + UUID.randomUUID();

        HospitalAppointment appointment = new HospitalAppointment();

        appointment.setHospitalAuthUserId(request.getHospitalAuthUserId());
        appointment.setHospitalDoctorId(request.getHospitalDoctorId());
        appointment.setPatientAuthUserId(CurrentUserUtil.getUserId());

        appointment.setDoctorName(doctor.getDoctorName());
        appointment.setDepartment(doctor.getDepartment());

        appointment.setPatientName(request.getPatientName());
        appointment.setPatientMobile(request.getPatientMobile());
        appointment.setPatientEmail(request.getPatientEmail());
        appointment.setSymptoms(request.getSymptoms());

        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());

        appointment.setConsultationType(HospitalConsultationType.ONLINE);

        appointment.setStatus(HospitalAppointmentStatus.PAYMENT_PENDING);
        appointment.setPaymentStatus(HospitalPaymentStatus.INITIATED);

        appointment.setConsultationFee(consultationFeeRupees);
        appointment.setPaymentOrderId(merchantOrderId);
        appointment.setCreatedAt(LocalDateTime.now());

        HospitalAppointment savedAppointment = appointmentRepository.save(appointment);

        String redirectUrl = phonePeHospitalService.createCheckoutPayment(
                merchantOrderId,
                amountInPaise,
                savedAppointment.getId()
        );

        return new HospitalPaymentStartResponse(
                savedAppointment.getId(),
                merchantOrderId,
                redirectUrl
        );
    }

    @Transactional
    public HospitalAppointment markPaymentSuccess(String merchantOrderId, String transactionId) {

        HospitalAppointment appointment = appointmentRepository
                .findByPaymentOrderId(merchantOrderId)
                .orElseThrow(() -> new RuntimeException("Hospital appointment not found"));

        if (appointment.getPaymentStatus() == HospitalPaymentStatus.SUCCESS) {
            return appointment;
        }

        appointment.setPaymentStatus(HospitalPaymentStatus.SUCCESS);
        appointment.setStatus(HospitalAppointmentStatus.CONFIRMED);
        appointment.setPaymentTransactionId(transactionId);

        if (appointment.getConsultationType() == HospitalConsultationType.ONLINE) {
            if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
                appointment.setMeetingUrl(
                        videoMeetingService.generateMeetingUrl(appointment.getId())
                );
            }
        }

        return appointmentRepository.save(appointment);
    }

    @Transactional
    public HospitalAppointment markPaymentFailed(String merchantOrderId) {

        HospitalAppointment appointment = appointmentRepository
                .findByPaymentOrderId(merchantOrderId)
                .orElseThrow(() -> new RuntimeException("Hospital appointment not found"));

        if (appointment.getPaymentStatus() == HospitalPaymentStatus.SUCCESS) {
            return appointment;
        }

        appointment.setPaymentStatus(HospitalPaymentStatus.FAILED);
        appointment.setStatus(HospitalAppointmentStatus.PAYMENT_FAILED);

        return appointmentRepository.save(appointment);
    }

    private void validateVideoAppointmentRequest(BookHospitalVideoAppointmentRequest request) {

        if (request == null) {
            throw new RuntimeException("Appointment request is required");
        }

        if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
            throw new RuntimeException("Only PATIENT can book hospital video consultation");
        }

        if (request.getHospitalAuthUserId() == null) {
            throw new RuntimeException("Hospital is required");
        }

        if (request.getHospitalDoctorId() == null) {
            throw new RuntimeException("Hospital doctor is required");
        }

        if (request.getPatientName() == null || request.getPatientName().isBlank()) {
            throw new RuntimeException("Patient name is required");
        }

        if (request.getPatientMobile() == null || request.getPatientMobile().isBlank()) {
            throw new RuntimeException("Patient mobile is required");
        }

        if (request.getPatientEmail() == null || request.getPatientEmail().isBlank()) {
            throw new RuntimeException("Patient email is required");
        }

        if (request.getAppointmentDate() == null) {
            throw new RuntimeException("Appointment date is required");
        }

        if (request.getAppointmentTime() == null) {
            throw new RuntimeException("Appointment time is required");
        }

        if (request.getSymptoms() == null || request.getSymptoms().isBlank()) {
            throw new RuntimeException("Symptoms are required");
        }
    }
    
    @Transactional
    public HospitalPaymentVerifyResponse verifyHospitalPayment(Long appointmentId, String merchantOrderId) {

        if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
            throw new RuntimeException("Only PATIENT can verify hospital appointment payment");
        }

        HospitalAppointment appointment = appointmentRepository
                .findByIdAndPatientAuthUserId(appointmentId, CurrentUserUtil.getUserId())
                .orElseThrow(() -> new RuntimeException("Hospital appointment not found"));

        if (appointment.getPaymentOrderId() == null ||
                !appointment.getPaymentOrderId().equals(merchantOrderId)) {
            throw new RuntimeException("Invalid merchant order id");
        }

        if (appointment.getPaymentStatus() == HospitalPaymentStatus.SUCCESS) {
            return new HospitalPaymentVerifyResponse(
                    true,
                    "Hospital payment already verified.",
                    appointment.getId(),
                    appointment.getStatus().name(),
                    appointment.getPaymentStatus().name(),
                    appointment.getMeetingUrl()
            );
        }

        appointment.setPaymentStatus(HospitalPaymentStatus.SUCCESS);
        appointment.setStatus(HospitalAppointmentStatus.CONFIRMED);
        appointment.setPaymentTransactionId(merchantOrderId);

        if (appointment.getConsultationType() == HospitalConsultationType.ONLINE) {
            if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
                appointment.setMeetingUrl(
                        videoMeetingService.generateMeetingUrl(appointment.getId())
                );
            }
        }

        HospitalAppointment saved = appointmentRepository.save(appointment);

        return new HospitalPaymentVerifyResponse(
                true,
                "Hospital payment verified successfully. Appointment confirmed.",
                saved.getId(),
                saved.getStatus().name(),
                saved.getPaymentStatus().name(),
                saved.getMeetingUrl()
        );
    }
}