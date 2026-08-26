package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasAppointmentRequest;
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
import com.example.medi.saas.enums.SaasStaffRole;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;

@Service
public class SaasAppointmentService {

	private final SaasAppointmentRepository appointmentRepository;

	private final SaasPatientRepository patientRepository;

	private final SaasStaffRepository staffRepository;

	private final TenantMemberRepository tenantMemberRepository;

	private final TenantRepository tenantRepository;

	private final TenantAccessService tenantAccessService;

	private final SaasPermissionService permissionService;

	private final SaasNotificationService notificationService;

	private final SaasDoctorAvailabilityService availabilityService;

	public SaasAppointmentService(SaasAppointmentRepository appointmentRepository,
			SaasPatientRepository patientRepository, SaasStaffRepository staffRepository,
			TenantMemberRepository tenantMemberRepository, TenantRepository tenantRepository,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			SaasNotificationService notificationService, SaasDoctorAvailabilityService availabilityService) {

		this.appointmentRepository = appointmentRepository;

		this.patientRepository = patientRepository;

		this.staffRepository = staffRepository;

		this.tenantMemberRepository = tenantMemberRepository;

		this.tenantRepository = tenantRepository;

		this.tenantAccessService = tenantAccessService;

		this.permissionService = permissionService;

		this.notificationService = notificationService;

		this.availabilityService = availabilityService;
	}

	/*
	 * ========================================================= CREATE OFFLINE
	 * APPOINTMENT =========================================================
	 */

	@Transactional
	public SaasAppointmentResponse createAppointment(SaasAppointmentRequest request) {

		validateRequest(request);

		Long currentAuthUserId = getCurrentAuthUserId();

		boolean patientLogin = isPatientRole();

		Long tenantId = request.getTenantId();

		SaasPatient patient;

		if (patientLogin) {

			/*
			 * PATIENT: Never trust patientId from browser.
			 */
			patient = patientRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, currentAuthUserId)
					.orElseThrow(() -> new AccessDeniedException("Patient is not assigned to this workspace."));

			requireActiveTenantForPatient(tenantId);

		} else {

			/*
			 * Doctor / Hospital / Staff flow.
			 */
			tenantAccessService.validateTenantAccess(tenantId);

			permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.CREATE);

			if (request.getPatientId() == null) {

				throw new RuntimeException("Patient is required.");
			}

			patient = patientRepository.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), tenantId)
					.orElseThrow(() -> new RuntimeException("Patient not found in selected workspace."));
		}

		SaasStaff doctor = getAndValidateDoctor(tenantId, request.getDoctorStaffId());

		/*
		 * Doctor account cannot create appointment for another doctor.
		 */
		if (!patientLogin) {

			validateSelectedDoctorAccess(tenantId, doctor);
		}

		SaasAppointmentType appointmentType = parseAppointmentType(request.getAppointmentType());

		validateOnlineConsultation(appointmentType, doctor);

		validateSlotExistsInAvailability(tenantId, doctor.getAuthUserId(), request.getAppointmentDate(),
				request.getAppointmentTime());

		validateSlotNotAlreadyBooked(tenantId, doctor.getAuthUserId(), request.getAppointmentDate(),
				request.getAppointmentTime(), null);

		SaasAppointment appointment = new SaasAppointment();

		appointment.setTenantId(tenantId);

		appointment.setPatientId(patient.getId());

		appointment.setDoctorStaffId(doctor.getId());

		appointment.setDoctorAuthUserId(doctor.getAuthUserId());

		appointment.setDoctorName(doctor.getStaffName());

		appointment.setDepartment(doctor.getDepartment());

		appointment.setSpecialization(doctor.getSpecialization());

		appointment.setAppointmentType(appointmentType);

		appointment.setAppointmentDate(request.getAppointmentDate());

		appointment.setAppointmentTime(normalizeTime(request.getAppointmentTime()));

		appointment.setSymptoms(clean(request.getSymptoms()));

		appointment.setNotes(clean(request.getNotes()));

		/*
		 * Offline appointment starts as PENDING.
		 */
		appointment.setStatus(SaasAppointmentStatus.PENDING);

		appointment.setPaymentStatus("NOT_REQUIRED");

		appointment.setCreatedByAuthUserId(currentAuthUserId);

		appointment.setActive(true);

		SaasAppointment saved = appointmentRepository.saveAndFlush(appointment);

		notificationService.createSystemNotification(saved.getTenantId(), SaasNotificationType.APPOINTMENT,
				SaasNotificationPriority.HIGH, "New appointment booked",
				"New appointment has been booked with " + saved.getDoctorName(), saved.getId(), "APPOINTMENT",
				"/saas/appointments");

		return toResponse(saved);
	}

	/*
	 * ========================================================= PATIENT
	 * APPOINTMENTS =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasAppointmentResponse> getMyPatientAppointments(Long tenantId) {

		Long authUserId = getCurrentAuthUserId();

		if (!isPatientRole()) {

			throw new AccessDeniedException("Only patient can access this endpoint.");
		}

		requireActiveTenantForPatient(tenantId);

		SaasPatient patient = patientRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, authUserId)
				.orElseThrow(() -> new AccessDeniedException("Patient is not assigned to this workspace."));

		return appointmentRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId,
						patient.getId())
				.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= ALL WORKSPACE
	 * APPOINTMENTS =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasAppointmentResponse> getAppointments(Long tenantId) {

		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		Long authUserId = getCurrentAuthUserId();

		TenantMember member = getCurrentTenantMember(tenantId, authUserId);

		List<SaasAppointment> appointments;

		if (member.getMemberRole() == TenantMemberRole.DOCTOR) {

			appointments = appointmentRepository
					.findByTenantIdAndDoctorAuthUserIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
							tenantId, authUserId);

		} else {

			appointments = appointmentRepository
					.findByTenantIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId);
		}

		return appointments.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= DOCTOR APPOINTMENTS
	 * =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasAppointmentResponse> getDoctorAppointments(Long tenantId, Long doctorAuthUserId) {

		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		if (doctorAuthUserId == null) {

			throw new RuntimeException("doctorAuthUserId is required.");
		}

		Long currentUserId = getCurrentAuthUserId();

		TenantMember member = getCurrentTenantMember(tenantId, currentUserId);

		if (member.getMemberRole() == TenantMemberRole.DOCTOR && !currentUserId.equals(doctorAuthUserId)) {

			throw new AccessDeniedException("You cannot view another doctor's appointments.");
		}

		return appointmentRepository
				.findByTenantIdAndDoctorAuthUserIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId,
						doctorAuthUserId)
				.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= GET SINGLE
	 * =========================================================
	 */

	@Transactional(readOnly = true)
	public SaasAppointmentResponse getAppointment(Long tenantId, Long appointmentId) {

		if (isPatientRole()) {

			Long userId = getCurrentAuthUserId();

			SaasPatient patient = patientRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, userId)
					.orElseThrow(() -> new AccessDeniedException("Patient is not assigned to this workspace."));

			SaasAppointment appointment = appointmentRepository
					.findByIdAndTenantIdAndActiveTrue(appointmentId, tenantId)
					.orElseThrow(() -> new RuntimeException("Appointment not found."));

			if (!patient.getId().equals(appointment.getPatientId())) {

				throw new AccessDeniedException("You cannot access this appointment.");
			}

			return toResponse(appointment);
		}

		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasAppointment appointment = getAppointmentEntity(tenantId, appointmentId);

		validateAppointmentAccess(tenantId, appointment);

		return toResponse(appointment);
	}

	/*
	 * ========================================================= UPDATE
	 * =========================================================
	 */

	@Transactional
	public SaasAppointmentResponse updateAppointment(Long tenantId, Long appointmentId,
			SaasAppointmentRequest request) {

		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.UPDATE);

		tenantAccessService.validateTenantAccess(tenantId);

		if (request == null) {

			throw new RuntimeException("Appointment request is required.");
		}

		request.setTenantId(tenantId);

		validateRequest(request);

		SaasAppointment appointment = getAppointmentEntity(tenantId, appointmentId);

		validateAppointmentAccess(tenantId, appointment);

		if (appointment.getStatus() == SaasAppointmentStatus.COMPLETED
				|| appointment.getStatus() == SaasAppointmentStatus.CANCELLED
				|| appointment.getStatus() == SaasAppointmentStatus.REJECTED) {

			throw new RuntimeException("This appointment cannot be updated.");
		}

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		SaasStaff doctor = getAndValidateDoctor(tenantId, request.getDoctorStaffId());

		validateSelectedDoctorAccess(tenantId, doctor);

		SaasAppointmentType type = parseAppointmentType(request.getAppointmentType());

		validateOnlineConsultation(type, doctor);

		validateSlotExistsInAvailability(tenantId, doctor.getAuthUserId(), request.getAppointmentDate(),
				request.getAppointmentTime());

		validateSlotNotAlreadyBooked(tenantId, doctor.getAuthUserId(), request.getAppointmentDate(),
				request.getAppointmentTime(), appointmentId);

		appointment.setPatientId(patient.getId());

		appointment.setDoctorStaffId(doctor.getId());

		appointment.setDoctorAuthUserId(doctor.getAuthUserId());

		appointment.setDoctorName(doctor.getStaffName());

		appointment.setDepartment(doctor.getDepartment());

		appointment.setSpecialization(doctor.getSpecialization());

		appointment.setAppointmentType(type);

		appointment.setAppointmentDate(request.getAppointmentDate());

		appointment.setAppointmentTime(normalizeTime(request.getAppointmentTime()));

		appointment.setSymptoms(clean(request.getSymptoms()));

		appointment.setNotes(clean(request.getNotes()));

		appointment.touch();

		return toResponse(appointmentRepository.saveAndFlush(appointment));
	}

	/*
	 * ========================================================= STATUS
	 * =========================================================
	 */

	@Transactional
	public SaasAppointmentResponse updateStatus(Long tenantId, Long appointmentId, String status) {

		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.UPDATE);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasAppointment appointment = getAppointmentEntity(tenantId, appointmentId);

		validateAppointmentAccess(tenantId, appointment);

		SaasAppointmentStatus newStatus = parseAppointmentStatus(status);

		validateStatusTransition(appointment.getStatus(), newStatus);

		appointment.setStatus(newStatus);

		appointment.touch();

		SaasAppointment saved = appointmentRepository.save(appointment);

		notificationService.createSystemNotification(saved.getTenantId(), SaasNotificationType.APPOINTMENT,
				SaasNotificationPriority.MEDIUM, "Appointment status updated",
				"Appointment status changed to " + saved.getStatus().name(), saved.getId(), "APPOINTMENT",
				"/saas/appointments");

		return toResponse(saved);
	}

	/*
	 * ========================================================= CANCEL
	 * =========================================================
	 */

	@Transactional
	public ApiResponse cancelAppointment(Long tenantId, Long appointmentId) {

		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.DELETE);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasAppointment appointment = getAppointmentEntity(tenantId, appointmentId);

		validateAppointmentAccess(tenantId, appointment);

		if (appointment.getStatus() == SaasAppointmentStatus.COMPLETED) {

			throw new RuntimeException("Completed appointment cannot be cancelled.");
		}

		appointment.setStatus(SaasAppointmentStatus.CANCELLED);

		appointment.touch();

		appointmentRepository.save(appointment);

		return new ApiResponse(true, "Appointment cancelled successfully.");
	}

	/*
	 * ========================================================= PATIENT TENANT
	 * VALIDATION =========================================================
	 */

	private void requireActiveTenantForPatient(Long tenantId) {

		Tenant tenant = tenantRepository.findById(tenantId)
				.orElseThrow(() -> new RuntimeException("Workspace not found."));

		if (tenant.getStatus() != TenantStatus.ACTIVE) {

			throw new RuntimeException("This workspace is not active.");
		}
	}

	/*
	 * ========================================================= PATIENT ROLE
	 * =========================================================
	 */

	private boolean isPatientRole() {

		String role = CurrentUserUtil.getRole();

		return role != null && role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "").equals("PATIENT");
	}

	/*
	 * ========================================================= ACCESS
	 * =========================================================
	 */

	private void validateAppointmentAccess(Long tenantId, SaasAppointment appointment) {

		Long currentUserId = getCurrentAuthUserId();

		TenantMember member = getCurrentTenantMember(tenantId, currentUserId);

		if (member.getMemberRole() == TenantMemberRole.DOCTOR) {

			if (!currentUserId.equals(appointment.getDoctorAuthUserId())) {

				throw new AccessDeniedException("You cannot access another doctor's appointment.");
			}
		}
	}

	private void validateSelectedDoctorAccess(Long tenantId, SaasStaff doctor) {

		Long userId = getCurrentAuthUserId();

		TenantMember member = getCurrentTenantMember(tenantId, userId);

		if (member.getMemberRole() == TenantMemberRole.DOCTOR && !userId.equals(doctor.getAuthUserId())) {

			throw new AccessDeniedException("A doctor can work only with their own appointments.");
		}
	}

	private TenantMember getCurrentTenantMember(Long tenantId, Long authUserId) {

		return tenantMemberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, authUserId)
				.orElseThrow(() -> new AccessDeniedException("You are not an active member of this workspace."));
	}

	private Long getCurrentAuthUserId() {

		Long id = CurrentUserUtil.getUserId();

		if (id == null) {

			throw new AccessDeniedException("Logged-in user ID not found.");
		}

		return id;
	}

	/*
	 * ========================================================= DOCTOR
	 * =========================================================
	 */

	private SaasStaff getAndValidateDoctor(Long tenantId, Long doctorStaffId) {

		if (doctorStaffId == null) {

			throw new RuntimeException("Doctor is required.");
		}

		SaasStaff doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Selected doctor not found."));

		if (doctor.getStaffRole() != SaasStaffRole.DOCTOR) {

			throw new RuntimeException("Selected staff member is not a doctor.");
		}

		if (doctor.getAuthUserId() == null) {

			throw new RuntimeException("Selected doctor's login user is missing.");
		}

		return doctor;
	}

	private void validateOnlineConsultation(SaasAppointmentType type, SaasStaff doctor) {

		if (type == SaasAppointmentType.ONLINE && !Boolean.TRUE.equals(doctor.getOnlineConsultationEnabled())) {

			throw new RuntimeException("Online consultation is not enabled for selected doctor.");
		}
	}

	/*
	 * ========================================================= SLOT
	 * =========================================================
	 */

	private void validateSlotExistsInAvailability(Long tenantId, Long doctorAuthUserId, LocalDate date,
			LocalTime time) {

		boolean available = availabilityService.isSlotAvailableInternal(tenantId, doctorAuthUserId, date,
				normalizeTime(time));

		if (!available) {

			throw new RuntimeException("Selected time is not available in doctor's schedule.");
		}
	}

	private void validateSlotNotAlreadyBooked(Long tenantId, Long doctorAuthUserId, LocalDate date, LocalTime time,
			Long excludedAppointmentId) {

		List<SaasAppointmentStatus> bookedStatuses = List.of(SaasAppointmentStatus.PAYMENT_PENDING,
				SaasAppointmentStatus.PENDING, SaasAppointmentStatus.CONFIRMED, SaasAppointmentStatus.IN_CONSULTATION,
				SaasAppointmentStatus.COMPLETED);

		LocalTime normalized = normalizeTime(time);

		boolean booked;

		if (excludedAppointmentId == null) {

			booked = appointmentRepository
					.existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusIn(tenantId,
							doctorAuthUserId, date, normalized, bookedStatuses);

		} else {

			booked = appointmentRepository
					.existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusInAndIdNot(
							tenantId, doctorAuthUserId, date, normalized, bookedStatuses, excludedAppointmentId);
		}

		if (booked) {

			throw new RuntimeException("Selected slot is already booked. Please choose another slot.");
		}
	}

	/*
	 * ========================================================= VALIDATION
	 * =========================================================
	 */

	private void validateRequest(SaasAppointmentRequest request) {

		if (request == null) {

			throw new RuntimeException("Appointment request is required.");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required.");
		}

		if (request.getDoctorStaffId() == null) {

			throw new RuntimeException("doctorStaffId is required.");
		}

		parseAppointmentType(request.getAppointmentType());

		if (request.getAppointmentDate() == null) {

			throw new RuntimeException("Appointment date is required.");
		}

		if (request.getAppointmentDate().isBefore(LocalDate.now())) {

			throw new RuntimeException("Appointment date cannot be in the past.");
		}

		if (request.getAppointmentTime() == null) {

			throw new RuntimeException("Appointment time is required.");
		}

		LocalTime time = normalizeTime(request.getAppointmentTime());

		if (request.getAppointmentDate().equals(LocalDate.now()) && time.isBefore(normalizeTime(LocalTime.now()))) {

			throw new RuntimeException("Appointment time cannot be in the past.");
		}

		if (request.getSymptoms() == null || request.getSymptoms().isBlank()) {

			throw new RuntimeException("Symptoms are required.");
		}
	}

	private SaasAppointmentType parseAppointmentType(String value) {

		if (value == null || value.isBlank()) {

			throw new RuntimeException("Appointment type is required.");
		}

		try {

			return SaasAppointmentType.valueOf(value.trim().toUpperCase());

		} catch (IllegalArgumentException e) {

			throw new RuntimeException("Invalid appointment type: " + value);
		}
	}

	private SaasAppointmentStatus parseAppointmentStatus(String value) {

		try {

			return SaasAppointmentStatus.valueOf(value.trim().toUpperCase());

		} catch (Exception e) {

			throw new RuntimeException("Invalid appointment status: " + value);
		}
	}

	private void validateStatusTransition(SaasAppointmentStatus current, SaasAppointmentStatus next) {

		if (current == null) {
			return;
		}

		if (current == SaasAppointmentStatus.COMPLETED || current == SaasAppointmentStatus.CANCELLED
				|| current == SaasAppointmentStatus.REJECTED) {

			throw new RuntimeException("This appointment status cannot be changed.");
		}

		if (current == next) {

			throw new RuntimeException("Appointment already has status " + next.name());
		}
	}

	/*
	 * ========================================================= ENTITY
	 * =========================================================
	 */

	private SaasAppointment getAppointmentEntity(Long tenantId, Long appointmentId) {

		return appointmentRepository.findByIdAndTenantIdAndActiveTrue(appointmentId, tenantId)
				.orElseThrow(() -> new RuntimeException("Appointment not found."));
	}

	private LocalTime normalizeTime(LocalTime time) {

		return time == null ? null : time.withSecond(0).withNano(0);
	}

	private String clean(String value) {

		if (value == null) {
			return null;
		}

		String result = value.trim();

		return result.isBlank() ? null : result;
	}

	/*
	 * ========================================================= RESPONSE
	 * =========================================================
	 */

	private SaasAppointmentResponse toResponse(SaasAppointment appointment) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(appointment.getPatientId(), appointment.getTenantId()).orElse(null);

		SaasAppointmentResponse response = new SaasAppointmentResponse();

		response.setId(appointment.getId());

		response.setTenantId(appointment.getTenantId());

		response.setPatientId(appointment.getPatientId());

		response.setPatientCode(patient == null ? null : patient.getPatientCode());

		response.setPatientName(patient == null ? null : patient.getPatientName());

		response.setPatientMobile(patient == null ? null : patient.getMobile());

		response.setPatientEmail(patient == null ? null : patient.getEmail());

		response.setDoctorStaffId(appointment.getDoctorStaffId());

		response.setDoctorAuthUserId(appointment.getDoctorAuthUserId());

		response.setDoctorName(appointment.getDoctorName());

		response.setDepartment(appointment.getDepartment());

		response.setSpecialization(appointment.getSpecialization());

		response.setAppointmentType(
				appointment.getAppointmentType() == null ? null : appointment.getAppointmentType().name());

		response.setConsultationType(
				appointment.getAppointmentType() == SaasAppointmentType.ONLINE ? "ONLINE" : "OFFLINE");

		response.setAppointmentDate(appointment.getAppointmentDate());

		response.setAppointmentTime(appointment.getAppointmentTime());

		response.setStatus(appointment.getStatus() == null ? null : appointment.getStatus().name());

		response.setSymptoms(appointment.getSymptoms());

		response.setNotes(appointment.getNotes());

		response.setMeetingUrl(appointment.getMeetingUrl());

		response.setConsultationFee(appointment.getConsultationFee());

		response.setPaymentStatus(appointment.getPaymentStatus());

		response.setPaymentOrderId(appointment.getPaymentOrderId());

		response.setPaymentTransactionId(appointment.getPaymentTransactionId());

		response.setActive(appointment.getActive());

		response.setCreatedAt(appointment.getCreatedAt());

		return response;
	}

	public void validateForOnlinePayment(Long tenantId, Long doctorAuthUserId, LocalDate date, LocalTime time) {

		requireActiveTenantForPatient(tenantId);

		validateSlotExistsInAvailability(tenantId, doctorAuthUserId, date, time);

		validateSlotNotAlreadyBooked(tenantId, doctorAuthUserId, date, time, null);
	}
}