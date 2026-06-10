package com.example.medi.doctor.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.medi.doctor.dto.BookVideoAppointmentRequest;
import com.example.medi.doctor.dto.PaymentStartResponse;
import com.example.medi.doctor.entity.Appointment;
import com.example.medi.doctor.enums.AppointmentStatus;
import com.example.medi.doctor.enums.PaymentStatus;
import com.example.medi.doctor.repository.AppointmentRepository;
import com.example.medi.doctor.security.CurrentUserUtil;

@Service
public class AppointmentPaymentService {

    private final AppointmentRepository appointmentRepository;
    private final PhonePeService phonePeService;
    private final VideoMeetingService videoMeetingService;

    public AppointmentPaymentService(AppointmentRepository appointmentRepository,
                                     PhonePeService phonePeService,
                                     VideoMeetingService videoMeetingService) {
        this.appointmentRepository = appointmentRepository;
        this.phonePeService = phonePeService;
        this.videoMeetingService = videoMeetingService;
    }

    public PaymentStartResponse bookVideoAppointmentAndStartPayment(
            BookVideoAppointmentRequest request) {

        if (request.getDoctorAuthUserId() == null) {
            throw new RuntimeException("Doctor is required");
        }

        if (request.getAppointmentDate() == null) {
            throw new RuntimeException("Appointment date is required");
        }

        if (request.getAppointmentTime() == null) {
            throw new RuntimeException("Appointment time is required");
        }

        Long consultationFeeRupees = 500L;
        Long amountInPaise = consultationFeeRupees * 100;

        String merchantOrderId = "MR-APT-" + UUID.randomUUID();

        Appointment appointment = new Appointment();

        appointment.setDoctorAuthUserId(request.getDoctorAuthUserId());
        appointment.setPatientAuthUserId(CurrentUserUtil.getUserId());
        appointment.setPatientName(request.getPatientName());
        appointment.setPatientMobile(request.getPatientMobile());
        appointment.setSymptoms(request.getSymptoms());
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());

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

    public Appointment markPaymentSuccess(String merchantOrderId,
                                          String transactionId) {

        Appointment appointment = appointmentRepository
                .findByPaymentOrderId(merchantOrderId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        appointment.setPaymentStatus(PaymentStatus.SUCCESS);
        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointment.setPaymentTransactionId(transactionId);

        if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
            appointment.setMeetingUrl(
                    videoMeetingService.generateMeetingUrl(appointment.getId())
            );
        }

        return appointmentRepository.save(appointment);
    }

    public Appointment markPaymentFailed(String merchantOrderId) {

        Appointment appointment = appointmentRepository
                .findByPaymentOrderId(merchantOrderId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        appointment.setPaymentStatus(PaymentStatus.FAILED);
        appointment.setStatus(AppointmentStatus.PAYMENT_FAILED);

        return appointmentRepository.save(appointment);
    }
}