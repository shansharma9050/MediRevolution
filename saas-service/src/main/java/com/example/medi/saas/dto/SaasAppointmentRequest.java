package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class SaasAppointmentRequest {

    private Long tenantId;

    private Long patientId;

    /*
     * SaasStaff table ka doctor record ID.
     */
    private Long doctorStaffId;

    /*
     * Frontend bhej sakta hai, lekin backend final value
     * SaasStaff se hi lega.
     */
    private Long doctorAuthUserId;

    private String doctorName;

    private String department;

    private String appointmentType;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    private String symptoms;

    private String notes;
}