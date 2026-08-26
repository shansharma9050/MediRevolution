package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class SaasAppointmentRequest {

	private Long tenantId;

	/*
	 * Existing doctor/hospital UI ke liye optional. Patient flow mein backend
	 * patient ko CurrentUserUtil se resolve karega.
	 */
	private Long patientId;

	private Long doctorStaffId;

	private Long doctorAuthUserId;

	private String doctorName;

	private String department;

	private String appointmentType;

	private LocalDate appointmentDate;

	private LocalTime appointmentTime;

	private String symptoms;

	private String notes;

	/*
	 * OFFLINE / ONLINE
	 */
	private String consultationType;
}