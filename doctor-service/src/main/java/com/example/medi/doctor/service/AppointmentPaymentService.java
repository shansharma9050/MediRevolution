package com.example.medi.doctor.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.medi.doctor.dto.BookVideoAppointmentRequest;
import com.example.medi.doctor.dto.PaymentStartResponse;
import com.example.medi.doctor.entity.Appointment;
import com.example.medi.doctor.enums.AppointmentStatus;
import com.example.medi.doctor.enums.ConsultationType;
import com.example.medi.doctor.enums.PaymentStatus;
import com.example.medi.doctor.repository.AppointmentRepository;
import com.example.medi.doctor.security.CurrentUserUtil;

@Service
public class AppointmentPaymentService {

    private final AppointmentRepository appointmentRepository;
    private final PhonePeService phonePeService;
    private final VideoMeetingService videoMeetingService;
    private final AppointmentNotificationService appointmentNotificationService;

    public AppointmentPaymentService(AppointmentRepository appointmentRepository,
                                     PhonePeService phonePeService,
                                     VideoMeetingService videoMeetingService,
                                     AppointmentNotificationService appointmentNotificationService) {
        this.appointmentRepository = appointmentRepository;
        this.phonePeService = phonePeService;
        this.videoMeetingService = videoMeetingService;
        this.appointmentNotificationService = appointmentNotificationService;
    }

    @Transactional
    public PaymentStartResponse bookVideoAppointmentAndStartPayment(BookVideoAppointmentRequest request) {

        validateVideoAppointmentRequest(request);

        Long consultationFeeRupees = 500L;
        Long amountInPaise = consultationFeeRupees * 100;

        String merchantOrderId = "MR-APT-" + UUID.randomUUID();

        Appointment appointment = new Appointment();

        appointment.setDoctorAuthUserId(request.getDoctorAuthUserId());
        appointment.setPatientAuthUserId(CurrentUserUtil.getUserId());

        appointment.setPatientName(request.getPatientName());
        appointment.setPatientMobile(request.getPatientMobile());
        appointment.setPatientEmail(request.getPatientEmail());
        appointment.setSymptoms(request.getSymptoms());

        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());

        appointment.setConsultationType(ConsultationType.ONLINE);

        appointment.setStatus(AppointmentStatus.PAYMENT_PENDING);
        appointment.setPaymentStatus(PaymentStatus.INITIATED);

        appointment.setConsultationFee(consultationFeeRupees);
        appointment.setPaymentOrderId(merchantOrderId);
        appointment.setCreatedAt(LocalDateTime.now());

        Appointment savedAppointment = appointmentRepository.save(appointment);

        String redirectUrl = phonePeService.createCheckoutPayment(
                merchantOrderId,
                amountInPaise,
                savedAppointment.getId()
        );

        return new PaymentStartResponse(
                savedAppointment.getId(),
                merchantOrderId,
                redirectUrl
        );
    }

    @Transactional
    public Appointment markPaymentSuccess(String merchantOrderId, String transactionId) {

        Appointment appointment = appointmentRepository
                .findByPaymentOrderId(merchantOrderId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (appointment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return appointment;
        }

        appointment.setPaymentStatus(PaymentStatus.SUCCESS);
        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointment.setPaymentTransactionId(transactionId);

        if (appointment.getConsultationType() == ConsultationType.ONLINE) {
            if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
                appointment.setMeetingUrl(
                        videoMeetingService.generateMeetingUrl(appointment.getId())
                );
            }
        }

        Appointment savedAppointment = appointmentRepository.save(appointment);

        appointmentNotificationService.sendMeetingLinkToPatient(savedAppointment);

        return savedAppointment;
    }

    @Transactional
    public Appointment markPaymentFailed(String merchantOrderId) {

        Appointment appointment = appointmentRepository
                .findByPaymentOrderId(merchantOrderId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (appointment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return appointment;
        }

        appointment.setPaymentStatus(PaymentStatus.FAILED);
        appointment.setStatus(AppointmentStatus.PAYMENT_FAILED);

        return appointmentRepository.save(appointment);
    }

    private void validateVideoAppointmentRequest(BookVideoAppointmentRequest request) {

        if (request == null) {
            throw new RuntimeException("Appointment request is required");
        }

        if (request.getDoctorAuthUserId() == null) {
            throw new RuntimeException("Doctor is required");
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
}