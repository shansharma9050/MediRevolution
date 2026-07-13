package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class SaasAppointmentResponse {

    private Long id;

    private Long tenantId;

    private Long patientId;

    private String patientCode;

    private String patientName;

    private String patientMobile;

    private Long doctorStaffId;

    private Long doctorAuthUserId;

    private String doctorName;

    private String department;

    private String specialization;

    private String appointmentType;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    private String status;

    private String symptoms;

    private String notes;

    private String meetingUrl;

    private Boolean active;

    private LocalDateTime createdAt;
}