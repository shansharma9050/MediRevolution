package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasAppointmentResponse;
import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasAppointmentType;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.enums.TenantStatus;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.repository.TenantRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class SaasAppointmentLifecycleService {

    private final SaasAppointmentRepository appointmentRepository;
    private final SaasPatientRepository patientRepository;
    private final SaasStaffRepository staffRepository;
    private final TenantRepository tenantRepository;
    private final TenantMemberRepository tenantMemberRepository;

    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;
    private final SaasPatientSelfResolverService patientSelfResolverService;
    private final SaasVideoMeetingService videoMeetingService;
    private final SaasNotificationService notificationService;


    public SaasAppointmentLifecycleService(
            SaasAppointmentRepository appointmentRepository,
            SaasPatientRepository patientRepository,
            SaasStaffRepository staffRepository,
            TenantRepository tenantRepository,
            TenantMemberRepository tenantMemberRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService,
            SaasPatientSelfResolverService patientSelfResolverService,
            SaasVideoMeetingService videoMeetingService,
            SaasNotificationService notificationService
    ) {

        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
        this.tenantRepository = tenantRepository;
        this.tenantMemberRepository = tenantMemberRepository;

        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
        this.patientSelfResolverService = patientSelfResolverService;
        this.videoMeetingService = videoMeetingService;
        this.notificationService = notificationService;
    }


    /*
     * ================================================================
     * WORKSPACE STATUS TRANSITION
     * ================================================================
     */

    @Transactional
    public SaasAppointmentResponse updateStatus(
            Long tenantId,
            Long appointmentId,
            String status
    ) {

        validateTenantAndAppointmentIds(
                tenantId,
                appointmentId
        );

        tenantAccessService.validateTenantAccess(
                tenantId
        );

        SaasAppointment appointment =
                getAppointment(
                        tenantId,
                        appointmentId
                );

        validateWorkspaceAppointmentAccess(
                tenantId,
                appointment
        );

        SaasAppointmentStatus nextStatus =
                parseStatus(
                        status
                );

        requirePermissionForTransition(
                tenantId,
                nextStatus
        );

        validateTransition(
                appointment,
                nextStatus
        );


        if (
                nextStatus
                        == SaasAppointmentStatus.CANCELLED
        ) {

            validateCancellation(
                    appointment
            );
        }


        if (
                (
                        nextStatus
                                == SaasAppointmentStatus.CONFIRMED
                        ||
                        nextStatus
                                == SaasAppointmentStatus.IN_CONSULTATION
                )
                &&
                appointment.getAppointmentType()
                        == SaasAppointmentType.ONLINE
        ) {

            ensureMeetingUrl(
                    appointment
            );
        }


        appointment.setStatus(
                nextStatus
        );

        appointment.touch();


        SaasAppointment saved =
                appointmentRepository.save(
                        appointment
                );


        createStatusNotification(
                saved
        );


        return toResponse(
                saved
        );
    }


    /*
     * ================================================================
     * WORKSPACE CANCEL
     * ================================================================
     */

    @Transactional
    public ApiResponse cancelWorkspaceAppointment(
            Long tenantId,
            Long appointmentId
    ) {

        updateStatus(
                tenantId,
                appointmentId,
                SaasAppointmentStatus.CANCELLED.name()
        );


        return new ApiResponse(
                true,
                "Appointment cancelled successfully."
        );
    }


    /*
     * ================================================================
     * PATIENT CANCEL OWN APPOINTMENT
     * ================================================================
     */

    @Transactional
    public ApiResponse cancelPatientAppointment(
            Long tenantId,
            Long appointmentId
    ) {

        validateTenantAndAppointmentIds(
                tenantId,
                appointmentId
        );


        if (!isPatientRole()) {

            throw new AccessDeniedException(
                    "Only patient can cancel own appointment."
            );
        }


        requireActiveTenant(
                tenantId
        );


        SaasPatient canonicalPatient =
                patientSelfResolverService
                        .resolvePatientEntity(
                                tenantId
                        );


        SaasAppointment appointment =
                getAppointment(
                        tenantId,
                        appointmentId
                );


        if (
                !canonicalPatient
                        .getId()
                        .equals(
                                appointment.getPatientId()
                        )
        ) {

            throw new AccessDeniedException(
                    "You cannot cancel another patient's appointment."
            );
        }


        if (
                appointment.getStatus()
                        != SaasAppointmentStatus.REQUESTED
                &&
                appointment.getStatus()
                        != SaasAppointmentStatus.PENDING
                &&
                appointment.getStatus()
                        != SaasAppointmentStatus.CONFIRMED
        ) {

            throw new RuntimeException(
                    "This appointment can no longer be cancelled."
            );
        }


        validateAppointmentHasNotStarted(
                appointment
        );


        validateCancellation(
                appointment
        );


        appointment.setStatus(
                SaasAppointmentStatus.CANCELLED
        );

        appointment.touch();


        appointmentRepository.save(
                appointment
        );


        createStatusNotification(
                appointment
        );


        return new ApiResponse(
                true,
                "Appointment cancelled successfully."
        );
    }


    /*
     * ================================================================
     * VALID TRANSITIONS
     * ================================================================
     */

    private void validateTransition(
            SaasAppointment appointment,
            SaasAppointmentStatus nextStatus
    ) {

        SaasAppointmentStatus currentStatus =
                appointment.getStatus();


        if (currentStatus == null) {

            throw new RuntimeException(
                    "Appointment status is unavailable."
            );
        }


        if (currentStatus == nextStatus) {

            throw new RuntimeException(
                    "Appointment already has status "
                            + nextStatus.name()
                            + "."
            );
        }


        boolean valid =
                switch (currentStatus) {

                    case REQUESTED, PENDING ->
                            nextStatus
                                    == SaasAppointmentStatus.CONFIRMED
                            ||
                            nextStatus
                                    == SaasAppointmentStatus.REJECTED
                            ||
                            nextStatus
                                    == SaasAppointmentStatus.CANCELLED;


                    case CONFIRMED ->
                            nextStatus
                                    == SaasAppointmentStatus.IN_CONSULTATION
                            ||
                            nextStatus
                                    == SaasAppointmentStatus.CANCELLED;


                    case IN_CONSULTATION ->
                            nextStatus
                                    == SaasAppointmentStatus.COMPLETED;


                    /*
                     * PhonePe controls payment states.
                     */
                    case PAYMENT_PENDING,
                         PAYMENT_FAILED,
                         COMPLETED,
                         REJECTED,
                         CANCELLED -> false;
                };


        if (!valid) {

            throw new RuntimeException(
                    "Invalid appointment status transition: "
                            + currentStatus.name()
                            + " -> "
                            + nextStatus.name()
            );
        }
    }


    /*
     * ================================================================
     * PERMISSION BY ACTION
     * ================================================================
     */

    private void requirePermissionForTransition(
            Long tenantId,
            SaasAppointmentStatus nextStatus
    ) {

        SaasPermissionAction action =
                switch (nextStatus) {

                    case CONFIRMED,
                         REJECTED ->
                            SaasPermissionAction.APPROVE;


                    case IN_CONSULTATION,
                         COMPLETED ->
                            SaasPermissionAction.UPDATE;


                    case CANCELLED ->
                            SaasPermissionAction.CANCEL;


                    default ->
                            throw new RuntimeException(
                                    "This status cannot be changed manually."
                            );
                };


        permissionService.requirePermission(
                tenantId,
                TenantModule.APPOINTMENTS,
                action
        );
    }


    /*
     * ================================================================
     * CANCEL SAFETY
     * ================================================================
     */

    private void validateCancellation(
            SaasAppointment appointment
    ) {

        /*
         * Refund flow is not implemented yet.
         *
         * Never silently cancel a successfully paid online consultation.
         */

        if (
                appointment.getAppointmentType()
                        == SaasAppointmentType.ONLINE
                &&
                "SUCCESS".equalsIgnoreCase(
                        appointment.getPaymentStatus()
                )
        ) {

            throw new RuntimeException(
                    "Paid online appointment cannot be cancelled directly. "
                            + "Refund handling is required first."
            );
        }
    }


    private void validateAppointmentHasNotStarted(
            SaasAppointment appointment
    ) {

        if (
                appointment.getAppointmentDate() == null
                ||
                appointment.getAppointmentTime() == null
        ) {

            return;
        }


        LocalDateTime appointmentDateTime =
                LocalDateTime.of(
                        appointment.getAppointmentDate(),
                        appointment.getAppointmentTime()
                );


        if (
                !appointmentDateTime.isAfter(
                        LocalDateTime.now()
                )
        ) {

            throw new RuntimeException(
                    "Appointment time has already started or expired."
            );
        }
    }


    /*
     * ================================================================
     * ONLINE CONSULTATION
     * ================================================================
     */

    private void ensureMeetingUrl(
            SaasAppointment appointment
    ) {

        if (
                appointment.getMeetingUrl() != null
                &&
                !appointment.getMeetingUrl().isBlank()
        ) {

            return;
        }


        appointment.setMeetingUrl(
                videoMeetingService
                        .generateMeetingUrl(
                                appointment.getId()
                        )
        );
    }


    /*
     * ================================================================
     * WORKSPACE ACCESS
     * ================================================================
     */

    private void validateWorkspaceAppointmentAccess(
            Long tenantId,
            SaasAppointment appointment
    ) {

        Long authUserId =
                CurrentUserUtil.getUserId();


        if (authUserId == null) {

            throw new AccessDeniedException(
                    "Logged-in user ID not found."
            );
        }


        TenantMember member =
                tenantMemberRepository
                        .findByTenantIdAndAuthUserIdAndActiveTrue(
                                tenantId,
                                authUserId
                        )
                        .orElseThrow(
                                () ->
                                        new AccessDeniedException(
                                                "You are not an active member of this workspace."
                                        )
                        );


        /*
         * Doctor can operate only on own appointment.
         */

        if (
                member.getMemberRole()
                        == TenantMemberRole.DOCTOR
                &&
                !authUserId.equals(
                        appointment.getDoctorAuthUserId()
                )
        ) {

            throw new AccessDeniedException(
                    "You cannot update another doctor's appointment."
            );
        }
    }


    /*
     * ================================================================
     * TENANT
     * ================================================================
     */

    private void requireActiveTenant(
            Long tenantId
    ) {

        Tenant tenant =
                tenantRepository
                        .findById(
                                tenantId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Workspace not found."
                                        )
                        );


        if (
                tenant.getStatus()
                        != TenantStatus.ACTIVE
        ) {

            throw new RuntimeException(
                    "This workspace is not active."
            );
        }
    }


    /*
     * ================================================================
     * ENTITY
     * ================================================================
     */

    private SaasAppointment getAppointment(
            Long tenantId,
            Long appointmentId
    ) {

        return appointmentRepository
                .findByIdAndTenantIdAndActiveTrue(
                        appointmentId,
                        tenantId
                )
                .orElseThrow(
                        () ->
                                new RuntimeException(
                                        "Appointment not found."
                                )
                );
    }


    private void validateTenantAndAppointmentIds(
            Long tenantId,
            Long appointmentId
    ) {

        if (
                tenantId == null
                ||
                tenantId <= 0
        ) {

            throw new RuntimeException(
                    "Valid tenantId is required."
            );
        }


        if (
                appointmentId == null
                ||
                appointmentId <= 0
        ) {

            throw new RuntimeException(
                    "Valid appointmentId is required."
            );
        }
    }


    private SaasAppointmentStatus parseStatus(
            String value
    ) {

        if (
                value == null
                ||
                value.isBlank()
        ) {

            throw new RuntimeException(
                    "Appointment status is required."
            );
        }


        try {

            return SaasAppointmentStatus.valueOf(
                    value
                            .trim()
                            .toUpperCase(
                                    Locale.ROOT
                            )
            );


        } catch (IllegalArgumentException exception) {

            throw new RuntimeException(
                    "Invalid appointment status: "
                            + value
            );
        }
    }


    private boolean isPatientRole() {

        String role =
                CurrentUserUtil.getRole();


        if (role == null) {

            return false;
        }


        return role
                .trim()
                .toUpperCase(
                        Locale.ROOT
                )
                .replaceFirst(
                        "^ROLE_",
                        ""
                )
                .equals(
                        "PATIENT"
                );
    }


    /*
     * ================================================================
     * NOTIFICATION
     * ================================================================
     */

    private void createStatusNotification(
            SaasAppointment appointment
    ) {

        notificationService.createSystemNotification(

                appointment.getTenantId(),

                SaasNotificationType.APPOINTMENT,

                SaasNotificationPriority.MEDIUM,

                "Appointment status updated",

                "Appointment with "
                        + safeDoctorName(
                                appointment
                        )
                        + " is now "
                        + appointment
                                .getStatus()
                                .name()
                                .replace(
                                        '_',
                                        ' '
                                ),

                appointment.getId(),

                "APPOINTMENT",

                "/saas/appointments"
        );
    }


    private String safeDoctorName(
            SaasAppointment appointment
    ) {

        if (
                appointment.getDoctorName() == null
                ||
                appointment
                        .getDoctorName()
                        .isBlank()
        ) {

            return "doctor";
        }


        return appointment
                .getDoctorName()
                .trim();
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


        SaasStaff doctor =
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
                doctor == null
                        ? appointment.getSpecialization()
                        : doctor.getSpecialization()
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
}