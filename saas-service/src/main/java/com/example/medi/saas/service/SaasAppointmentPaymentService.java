package com.example.medi.saas.service;

import com.example.medi.saas.dto.PaymentStartResponse;
import com.example.medi.saas.dto.SaasAppointmentRequest;
import com.example.medi.saas.dto.SaasAppointmentResponse;
import com.example.medi.saas.dto.SaasPhonePayPaymentStatus;
import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasAppointmentType;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Locale;
import java.util.UUID;

@Service
public class SaasAppointmentPaymentService {

    private final SaasAppointmentRepository appointmentRepository;

    private final SaasPatientRepository patientRepository;

    private final SaasStaffRepository staffRepository;

    private final SaasAppointmentService appointmentService;

    private final SaasPhonePeService phonePeService;

    private final SaasVideoMeetingService meetingService;

    private final SaasPatientSelfResolverService patientSelfResolverService;


    public SaasAppointmentPaymentService(
            SaasAppointmentRepository appointmentRepository,
            SaasPatientRepository patientRepository,
            SaasStaffRepository staffRepository,
            SaasAppointmentService appointmentService,
            SaasPhonePeService phonePeService,
            SaasVideoMeetingService meetingService,
            SaasPatientSelfResolverService patientSelfResolverService
    ) {

        this.appointmentRepository =
                appointmentRepository;

        this.patientRepository =
                patientRepository;

        this.staffRepository =
                staffRepository;

        this.appointmentService =
                appointmentService;

        this.phonePeService =
                phonePeService;

        this.meetingService =
                meetingService;

        this.patientSelfResolverService =
                patientSelfResolverService;
    }


    /*
     * ================================================================
     * ONLINE APPOINTMENT + PAYMENT
     * ================================================================
     */

    @Transactional
    public PaymentStartResponse bookOnlineAppointmentAndStartPayment(
            SaasAppointmentRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Appointment request is required."
            );
        }


        Long authUserId =
                CurrentUserUtil.getUserId();


        if (authUserId == null) {

            throw new RuntimeException(
                    "Patient login is required."
            );
        }


        if (request.getTenantId() == null) {

            throw new RuntimeException(
                    "Workspace is required."
            );
        }


        /*
         * Canonical patient resolution.
         *
         * If logged-in patient identity was merged into another Patient 360,
         * the appointment is created against the canonical patient.
         */

        SaasPatient patient =
                patientSelfResolverService
                        .resolvePatientEntity(
                                request.getTenantId()
                        );


        if (request.getDoctorStaffId() == null) {

            throw new RuntimeException(
                    "Doctor is required."
            );
        }


        SaasStaff doctor =
                staffRepository
                        .findByIdAndTenantIdAndActiveTrue(
                                request.getDoctorStaffId(),
                                request.getTenantId()
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Doctor not found."
                                        )
                        );


        if (request.getAppointmentDate() == null) {

            throw new RuntimeException(
                    "Appointment date is required."
            );
        }


        if (request.getAppointmentTime() == null) {

            throw new RuntimeException(
                    "Appointment time is required."
            );
        }


        if (
                request.getSymptoms() == null ||
                request.getSymptoms().isBlank()
        ) {

            throw new RuntimeException(
                    "Symptoms are required."
            );
        }


        if (
                !Boolean.TRUE.equals(
                        doctor.getOnlineConsultationEnabled()
                )
        ) {

            throw new RuntimeException(
                    "Online consultation is not enabled for selected doctor."
            );
        }


        if (
                request
                        .getAppointmentDate()
                        .isBefore(
                                LocalDate.now()
                        )
        ) {

            throw new RuntimeException(
                    "Appointment date cannot be in the past."
            );
        }


        /*
         * Availability validation.
         */

        appointmentService.validateForOnlinePayment(

                request.getTenantId(),

                doctor.getAuthUserId(),

                request.getAppointmentDate(),

                request.getAppointmentTime()
        );


        Long fee =
                doctor.getOnlineConsultationFee();


        if (
                fee == null ||
                fee <= 0
        ) {

            throw new RuntimeException(
                    "Online consultation fee is not configured for selected doctor."
            );
        }


        String merchantOrderId =
                "MR-SAAS-APT-"
                        + UUID.randomUUID();


        SaasAppointment appointment =
                new SaasAppointment();


        appointment.setTenantId(
                request.getTenantId()
        );

        appointment.setPatientId(
                patient.getId()
        );

        appointment.setDoctorStaffId(
                doctor.getId()
        );

        appointment.setDoctorAuthUserId(
                doctor.getAuthUserId()
        );

        appointment.setDoctorName(
                doctor.getStaffName()
        );

        appointment.setDepartment(
                doctor.getDepartment()
        );

        appointment.setSpecialization(
                doctor.getSpecialization()
        );

        appointment.setAppointmentType(
                SaasAppointmentType.ONLINE
        );

        appointment.setAppointmentDate(
                request.getAppointmentDate()
        );

        appointment.setAppointmentTime(
                normalizeTime(
                        request.getAppointmentTime()
                )
        );

        appointment.setSymptoms(
                request
                        .getSymptoms()
                        .trim()
        );

        appointment.setNotes(
                clean(
                        request.getNotes()
                )
        );

        appointment.setStatus(
                SaasAppointmentStatus.PAYMENT_PENDING
        );

        appointment.setPaymentStatus(
                "INITIATED"
        );

        appointment.setConsultationFee(
                fee
        );

        appointment.setPaymentOrderId(
                merchantOrderId
        );

        appointment.setCreatedByAuthUserId(
                authUserId
        );

        appointment.setActive(
                true
        );


        SaasAppointment saved =
                appointmentRepository
                        .saveAndFlush(
                                appointment
                        );


        String redirectUrl =
                phonePeService
                        .createCheckoutPayment(
                                merchantOrderId,
                                fee * 100,
                                saved.getId()
                        );


        return new PaymentStartResponse(
                saved.getId(),
                merchantOrderId,
                redirectUrl
        );
    }


    /*
     * ================================================================
     * PAYMENT SUCCESS
     * ================================================================
     */

    @Transactional
    public SaasAppointment markPaymentSuccess(
            String merchantOrderId,
            String transactionId
    ) {

        SaasAppointment appointment =
                appointmentRepository
                        .findByPaymentOrderId(
                                merchantOrderId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Appointment not found."
                                        )
                        );


        if (
                "SUCCESS".equalsIgnoreCase(
                        appointment.getPaymentStatus()
                )
        ) {

            return appointment;
        }


        appointment.setPaymentStatus(
                "SUCCESS"
        );

        appointment.setStatus(
                SaasAppointmentStatus.CONFIRMED
        );

        appointment.setPaymentTransactionId(
                transactionId
        );


        if (
                appointment.getMeetingUrl() == null ||
                appointment
                        .getMeetingUrl()
                        .isBlank()
        ) {

            appointment.setMeetingUrl(
                    meetingService
                            .generateMeetingUrl(
                                    appointment.getId()
                            )
            );
        }


        appointment.touch();


        return appointmentRepository.save(
                appointment
        );
    }


    /*
     * ================================================================
     * VERIFY PAYMENT
     * ================================================================
     */

    @Transactional
    public SaasAppointmentResponse verifyPayment(
            Long appointmentId,
            String merchantOrderId
    ) {

        if (appointmentId == null) {

            throw new RuntimeException(
                    "Appointment ID is required."
            );
        }


        if (
                merchantOrderId == null ||
                merchantOrderId.isBlank()
        ) {

            throw new RuntimeException(
                    "Merchant order ID is required."
            );
        }


        SaasAppointment appointment =
                appointmentRepository
                        .findById(
                                appointmentId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Appointment not found"
                                        )
                        );


        /*
         * If a patient is calling the verification endpoint, enforce
         * canonical Patient 360 ownership.
         */

        if (isPatientRole()) {

            SaasPatient patient =
                    patientSelfResolverService
                            .resolvePatientEntity(
                                    appointment.getTenantId()
                            );


            if (
                    !patient
                            .getId()
                            .equals(
                                    appointment.getPatientId()
                            )
            ) {

                throw new AccessDeniedException(
                        "You cannot verify another patient's appointment payment."
                );
            }
        }


        if (
                !merchantOrderId.equals(
                        appointment.getPaymentOrderId()
                )
        ) {

            throw new RuntimeException(
                    "Merchant order ID does not match appointment."
            );
        }


        if (
                "SUCCESS".equalsIgnoreCase(
                        appointment.getPaymentStatus()
                )
                &&
                appointment.getStatus()
                        == SaasAppointmentStatus.CONFIRMED
        ) {

            return toResponse(
                    appointment
            );
        }


        SaasPhonePayPaymentStatus paymentStatus =
                phonePeService
                        .checkPaymentStatus(
                                merchantOrderId
                        );


        String state =
                paymentStatus.getState();


        if (
                "COMPLETED".equalsIgnoreCase(
                        state
                )
                ||
                "SUCCESS".equalsIgnoreCase(
                        state
                )
        ) {

            appointment.setPaymentStatus(
                    "SUCCESS"
            );

            appointment.setStatus(
                    SaasAppointmentStatus.CONFIRMED
            );

            appointment.setPaymentTransactionId(
                    paymentStatus.getTransactionId()
            );


            if (
                    appointment.getMeetingUrl() == null ||
                    appointment
                            .getMeetingUrl()
                            .isBlank()
            ) {

                appointment.setMeetingUrl(
                        generateMeetingUrl(
                                appointment.getId()
                        )
                );
            }


            appointment.touch();


            return toResponse(
                    appointmentRepository.save(
                            appointment
                    )
            );
        }


        if (
                "FAILED".equalsIgnoreCase(
                        state
                )
                ||
                "PAYMENT_FAILED".equalsIgnoreCase(
                        state
                )
        ) {

            appointment.setPaymentStatus(
                    "FAILED"
            );

            appointment.setStatus(
                    SaasAppointmentStatus.PAYMENT_FAILED
            );

            appointment.touch();


            return toResponse(
                    appointmentRepository.save(
                            appointment
                    )
            );
        }


        appointment.setPaymentStatus(
                "PENDING"
        );

        appointment.touch();


        return toResponse(
                appointmentRepository.save(
                        appointment
                )
        );
    }


    /*
     * ================================================================
     * PAYMENT FAILED
     * ================================================================
     */

    @Transactional
    public SaasAppointment markPaymentFailed(
            String merchantOrderId
    ) {

        SaasAppointment appointment =
                appointmentRepository
                        .findByPaymentOrderId(
                                merchantOrderId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Appointment not found."
                                        )
                        );


        if (
                "SUCCESS".equalsIgnoreCase(
                        appointment.getPaymentStatus()
                )
        ) {

            return appointment;
        }


        appointment.setPaymentStatus(
                "FAILED"
        );

        appointment.setStatus(
                SaasAppointmentStatus.PAYMENT_FAILED
        );

        appointment.touch();


        return appointmentRepository.save(
                appointment
        );
    }


    /*
     * ================================================================
     * RESPONSE
     * ================================================================
     */

    private SaasAppointmentResponse toResponse(
            SaasAppointment appointment
    ) {

        SaasPatient patient =
                patientRepository
                        .findByIdAndTenantIdAndActiveTrue(
                                appointment.getPatientId(),
                                appointment.getTenantId()
                        )
                        .orElse(null);


        SaasStaff doctorStaff =
                staffRepository
                        .findByIdAndTenantIdAndActiveTrue(
                                appointment.getDoctorStaffId(),
                                appointment.getTenantId()
                        )
                        .orElse(null);


        SaasAppointmentResponse response =
                new SaasAppointmentResponse();


        response.setId(
                appointment.getId()
        );

        response.setTenantId(
                appointment.getTenantId()
        );

        response.setPatientId(
                appointment.getPatientId()
        );

        response.setPatientCode(
                patient == null
                        ? null
                        : patient.getPatientCode()
        );

        response.setPatientName(
                patient == null
                        ? null
                        : patient.getPatientName()
        );

        response.setPatientMobile(
                patient == null
                        ? null
                        : patient.getMobile()
        );

        response.setPatientEmail(
                patient == null
                        ? null
                        : patient.getEmail()
        );

        response.setDoctorStaffId(
                appointment.getDoctorStaffId()
        );

        response.setDoctorAuthUserId(
                appointment.getDoctorAuthUserId()
        );

        response.setDoctorName(
                appointment.getDoctorName()
        );

        response.setDepartment(
                appointment.getDepartment()
        );

        response.setSpecialization(
                doctorStaff == null
                        ? appointment.getSpecialization()
                        : doctorStaff.getSpecialization()
        );

        response.setAppointmentType(
                appointment.getAppointmentType() == null
                        ? null
                        : appointment
                                .getAppointmentType()
                                .name()
        );

        response.setConsultationType(
                appointment.getAppointmentType()
                        == SaasAppointmentType.ONLINE
                                ? "ONLINE"
                                : "OFFLINE"
        );

        response.setAppointmentDate(
                appointment.getAppointmentDate()
        );

        response.setAppointmentTime(
                appointment.getAppointmentTime()
        );

        response.setStatus(
                appointment.getStatus() == null
                        ? null
                        : appointment
                                .getStatus()
                                .name()
        );

        response.setSymptoms(
                appointment.getSymptoms()
        );

        response.setNotes(
                appointment.getNotes()
        );

        response.setMeetingUrl(
                appointment.getMeetingUrl()
        );

        response.setConsultationFee(
                appointment.getConsultationFee()
        );

        response.setPaymentStatus(
                appointment.getPaymentStatus()
        );

        response.setPaymentOrderId(
                appointment.getPaymentOrderId()
        );

        response.setPaymentTransactionId(
                appointment.getPaymentTransactionId()
        );

        response.setActive(
                appointment.getActive()
        );

        response.setCreatedAt(
                appointment.getCreatedAt()
        );


        return response;
    }


    /*
     * ================================================================
     * HELPERS
     * ================================================================
     */

    private boolean isPatientRole() {

        String role =
                CurrentUserUtil.getRole();


        if (role == null) {

            return false;
        }


        String normalized =
                role
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        )
                        .replaceFirst(
                                "^ROLE_",
                                ""
                        );


        return "PATIENT".equals(
                normalized
        );
    }


    private String generateMeetingUrl(
            Long appointmentId
    ) {

        String roomName =
                "medirevolution-saas-appointment-"
                        + appointmentId
                        + "-"
                        + UUID.randomUUID();


        return "https://meet.jit.si/"
                + roomName;
    }


    private LocalTime normalizeTime(
            LocalTime time
    ) {

        return time
                .withSecond(0)
                .withNano(0);
    }


    private String clean(
            String value
    ) {

        if (value == null) {

            return null;
        }


        String cleanValue =
                value.trim();


        return cleanValue.isBlank()
                ? null
                : cleanValue;
    }
}