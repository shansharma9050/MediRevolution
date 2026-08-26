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

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class SaasAppointmentPaymentService {

	private final SaasAppointmentRepository appointmentRepository;

	private final SaasPatientRepository patientRepository;

	private final SaasStaffRepository staffRepository;

	private final SaasAppointmentService appointmentService;

	private final SaasPhonePeService phonePeService;

	private final SaasVideoMeetingService meetingService;

	public SaasAppointmentPaymentService(SaasAppointmentRepository appointmentRepository,
			SaasPatientRepository patientRepository, SaasStaffRepository staffRepository,
			SaasAppointmentService appointmentService, SaasPhonePeService phonePeService,
			SaasVideoMeetingService meetingService) {

		this.appointmentRepository = appointmentRepository;

		this.patientRepository = patientRepository;

		this.staffRepository = staffRepository;

		this.appointmentService = appointmentService;

		this.phonePeService = phonePeService;

		this.meetingService = meetingService;
	}

	@Transactional
	public PaymentStartResponse bookOnlineAppointmentAndStartPayment(SaasAppointmentRequest request) {

		if (request == null) {

			throw new RuntimeException("Appointment request is required.");
		}

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new RuntimeException("Patient login is required.");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("Workspace is required.");
		}

		SaasPatient patient = patientRepository
				.findByTenantIdAndAuthUserIdAndActiveTrue(request.getTenantId(), authUserId)
				.orElseThrow(() -> new RuntimeException("Patient is not assigned to this workspace."));

		if (request.getDoctorStaffId() == null) {

			throw new RuntimeException("Doctor is required.");
		}

		SaasStaff doctor = staffRepository
				.findByIdAndTenantIdAndActiveTrue(request.getDoctorStaffId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Doctor not found."));

		if (request.getAppointmentDate() == null) {

			throw new RuntimeException("Appointment date is required.");
		}

		if (request.getAppointmentTime() == null) {

			throw new RuntimeException("Appointment time is required.");
		}

		if (request.getSymptoms() == null || request.getSymptoms().isBlank()) {

			throw new RuntimeException("Symptoms are required.");
		}

		if (!Boolean.TRUE.equals(doctor.getOnlineConsultationEnabled())) {

			throw new RuntimeException("Online consultation is not enabled for selected doctor.");
		}

		if (request.getAppointmentDate().isBefore(LocalDate.now())) {

			throw new RuntimeException("Appointment date cannot be in the past.");
		}

		/*
		 * Availability validation
		 */
		appointmentService.validateForOnlinePayment(request.getTenantId(), doctor.getAuthUserId(),
				request.getAppointmentDate(), request.getAppointmentTime());

		/*
		 * Online consultation fee.
		 *
		 * Agar aapke SaaSStaff field ka exact naam onlineConsultationFee hai, ye
		 * directly use hoga.
		 */
		Long fee = doctor.getOnlineConsultationFee();

		if (fee == null || fee <= 0) {

			throw new RuntimeException("Online consultation fee is not configured for selected doctor.");
		}

		String merchantOrderId = "MR-SAAS-APT-" + UUID.randomUUID();

		SaasAppointment appointment = new SaasAppointment();

		appointment.setTenantId(request.getTenantId());

		appointment.setPatientId(patient.getId());

		appointment.setDoctorStaffId(doctor.getId());

		appointment.setDoctorAuthUserId(doctor.getAuthUserId());

		appointment.setDoctorName(doctor.getStaffName());

		appointment.setDepartment(doctor.getDepartment());

		appointment.setSpecialization(doctor.getSpecialization());

		appointment.setAppointmentType(SaasAppointmentType.ONLINE);

		appointment.setAppointmentDate(request.getAppointmentDate());

		appointment.setAppointmentTime(normalizeTime(request.getAppointmentTime()));

		appointment.setSymptoms(request.getSymptoms().trim());

		appointment.setNotes(clean(request.getNotes()));

		appointment.setStatus(SaasAppointmentStatus.PAYMENT_PENDING);

		appointment.setPaymentStatus("INITIATED");

		appointment.setConsultationFee(fee);

		appointment.setPaymentOrderId(merchantOrderId);

		appointment.setCreatedByAuthUserId(authUserId);

		SaasAppointment saved = appointmentRepository.saveAndFlush(appointment);

		String redirectUrl = phonePeService.createCheckoutPayment(merchantOrderId, fee * 100, saved.getId());

		return new PaymentStartResponse(saved.getId(), merchantOrderId, redirectUrl);
	}

	@Transactional
	public SaasAppointment markPaymentSuccess(String merchantOrderId, String transactionId) {

		SaasAppointment appointment = appointmentRepository.findByPaymentOrderId(merchantOrderId)
				.orElseThrow(() -> new RuntimeException("Appointment not found."));

		if ("SUCCESS".equalsIgnoreCase(appointment.getPaymentStatus())) {

			return appointment;
		}

		appointment.setPaymentStatus("SUCCESS");

		appointment.setStatus(SaasAppointmentStatus.CONFIRMED);

		appointment.setPaymentTransactionId(transactionId);

		if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {

			appointment.setMeetingUrl(meetingService.generateMeetingUrl(appointment.getId()));
		}

		appointment.touch();

		return appointmentRepository.save(appointment);
	}

	@Transactional
	public SaasAppointmentResponse verifyPayment(Long appointmentId, String merchantOrderId) {

		if (appointmentId == null) {
			throw new RuntimeException("Appointment ID is required.");
		}

		if (merchantOrderId == null || merchantOrderId.isBlank()) {
			throw new RuntimeException("Merchant order ID is required.");
		}

		SaasAppointment appointment = appointmentRepository.findById(appointmentId)
				.orElseThrow(() -> new RuntimeException("Appointment not found"));

		if (!merchantOrderId.equals(appointment.getPaymentOrderId())) {

			throw new RuntimeException("Merchant order ID does not match appointment.");
		}

		/*
		 * Already verified.
		 */
		if ("SUCCESS".equalsIgnoreCase(appointment.getPaymentStatus())
				&& appointment.getStatus() == SaasAppointmentStatus.CONFIRMED) {

			return toResponse(appointment);
		}

		SaasPhonePayPaymentStatus paymentStatus = phonePeService.checkPaymentStatus(merchantOrderId);

		String state = paymentStatus.getState();

		if ("COMPLETED".equalsIgnoreCase(state) || "SUCCESS".equalsIgnoreCase(state)) {

			appointment.setPaymentStatus("SUCCESS");

			appointment.setStatus(SaasAppointmentStatus.CONFIRMED);

			appointment.setPaymentTransactionId(paymentStatus.getTransactionId());

			if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {

				appointment.setMeetingUrl(generateMeetingUrl(appointment.getId()));
			}

			appointment.touch();

			SaasAppointment saved = appointmentRepository.save(appointment);

			return toResponse(saved);
		}

		if ("FAILED".equalsIgnoreCase(state) || "PAYMENT_FAILED".equalsIgnoreCase(state)) {

			appointment.setPaymentStatus("FAILED");

			appointment.setStatus(SaasAppointmentStatus.PAYMENT_FAILED);

			appointment.touch();

			SaasAppointment saved = appointmentRepository.save(appointment);

			return toResponse(saved);
		}

		appointment.setPaymentStatus("PENDING");

		appointment.touch();

		SaasAppointment saved = appointmentRepository.save(appointment);

		return toResponse(saved);
	}

	private String generateMeetingUrl(Long appointmentId) {

		String roomName = "medirevolution-saas-appointment-" + appointmentId + "-" + UUID.randomUUID();

		return "https://meet.jit.si/" + roomName;
	}

	private SaasAppointmentResponse toResponse(SaasAppointment appointment) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(appointment.getPatientId(), appointment.getTenantId()).orElse(null);

		SaasStaff doctorStaff = staffRepository
				.findByIdAndTenantIdAndActiveTrue(appointment.getDoctorStaffId(), appointment.getTenantId())
				.orElse(null);

		SaasAppointmentResponse response = new SaasAppointmentResponse();

		response.setId(appointment.getId());

		response.setTenantId(appointment.getTenantId());

		response.setPatientId(appointment.getPatientId());

		response.setPatientCode(patient == null ? null : patient.getPatientCode());

		response.setPatientName(patient == null ? null : patient.getPatientName());

		response.setPatientMobile(patient == null ? null : patient.getMobile());

		response.setDoctorStaffId(appointment.getDoctorStaffId());

		response.setDoctorAuthUserId(appointment.getDoctorAuthUserId());

		response.setDoctorName(appointment.getDoctorName());

		response.setDepartment(appointment.getDepartment());

		response.setSpecialization(doctorStaff == null ? null : doctorStaff.getSpecialization());

		response.setAppointmentType(
				appointment.getAppointmentType() == null ? null : appointment.getAppointmentType().name());

		response.setAppointmentDate(appointment.getAppointmentDate());

		response.setAppointmentTime(appointment.getAppointmentTime());

		response.setStatus(appointment.getStatus() == null ? null : appointment.getStatus().name());

		response.setSymptoms(appointment.getSymptoms());

		response.setNotes(appointment.getNotes());

		response.setMeetingUrl(appointment.getMeetingUrl());

		response.setActive(appointment.getActive());

		response.setCreatedAt(appointment.getCreatedAt());

		return response;
	}

	@Transactional
	public SaasAppointment markPaymentFailed(String merchantOrderId) {

		SaasAppointment appointment = appointmentRepository.findByPaymentOrderId(merchantOrderId)
				.orElseThrow(() -> new RuntimeException("Appointment not found."));

		if ("SUCCESS".equalsIgnoreCase(appointment.getPaymentStatus())) {

			return appointment;
		}

		appointment.setPaymentStatus("FAILED");

		appointment.setStatus(SaasAppointmentStatus.PAYMENT_FAILED);

		appointment.touch();

		return appointmentRepository.save(appointment);
	}

	private LocalTime normalizeTime(LocalTime time) {

		return time.withSecond(0).withNano(0);
	}

	private String clean(String value) {

		if (value == null) {
			return null;
		}

		String v = value.trim();

		return v.isBlank() ? null : v;
	}
}