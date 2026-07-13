package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasAppointmentRequest;
import com.example.medi.saas.dto.SaasAppointmentResponse;

import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.entity.TenantMember;

import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasAppointmentType;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStaffRole;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.enums.TenantModule;

import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.repository.TenantMemberRepository;

import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class SaasAppointmentService {

	private final SaasAppointmentRepository appointmentRepository;
	private final SaasPatientRepository patientRepository;
	private final SaasStaffRepository staffRepository;
	private final TenantMemberRepository tenantMemberRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasNotificationService notificationService;
	private final SaasDoctorAvailabilityService availabilityService;

	public SaasAppointmentService(SaasAppointmentRepository appointmentRepository,
			SaasPatientRepository patientRepository, SaasStaffRepository staffRepository,
			TenantMemberRepository tenantMemberRepository, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService, SaasNotificationService notificationService,
			SaasDoctorAvailabilityService availabilityService) {
		this.appointmentRepository = appointmentRepository;
		this.patientRepository = patientRepository;
		this.staffRepository = staffRepository;
		this.tenantMemberRepository = tenantMemberRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.notificationService = notificationService;
		this.availabilityService = availabilityService;
	}

	/*
	 * ========================================================= CREATE APPOINTMENT
	 * =========================================================
	 */

	@Transactional
	public SaasAppointmentResponse createAppointment(SaasAppointmentRequest request) {
		validateRequest(request);

		tenantAccessService.validateTenantAccess(request.getTenantId());

		permissionService.requirePermission(request.getTenantId(), TenantModule.APPOINTMENTS,
				SaasPermissionAction.CREATE);

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Patient not found in selected workspace."));

		SaasStaff doctorStaff = getAndValidateDoctor(request.getTenantId(), request.getDoctorStaffId());

		/*
		 * Doctor login kisi doosre doctor ke naam par appointment create nahi kar
		 * sakta.
		 */
		validateSelectedDoctorAccess(request.getTenantId(), doctorStaff);

		SaasAppointmentType appointmentType = parseAppointmentType(request.getAppointmentType());

		validateOnlineConsultation(appointmentType, doctorStaff);

		validateSlotExistsInAvailability(request.getTenantId(), doctorStaff.getAuthUserId(),
				request.getAppointmentDate(), request.getAppointmentTime());

		validateSlotNotAlreadyBooked(request.getTenantId(), doctorStaff.getAuthUserId(), request.getAppointmentDate(),
				request.getAppointmentTime(), null);

		SaasAppointment appointment = new SaasAppointment();

		appointment.setTenantId(request.getTenantId());

		appointment.setPatientId(patient.getId());

		appointment.setDoctorStaffId(doctorStaff.getId());

		appointment.setDoctorAuthUserId(doctorStaff.getAuthUserId());

		appointment.setDoctorName(doctorStaff.getStaffName());

		appointment.setDepartment(doctorStaff.getDepartment());

		appointment.setAppointmentType(appointmentType);

		appointment.setAppointmentDate(request.getAppointmentDate());

		appointment.setAppointmentTime(normalizeTime(request.getAppointmentTime()));

		appointment.setSymptoms(clean(request.getSymptoms()));

		appointment.setNotes(clean(request.getNotes()));

		appointment.setCreatedByAuthUserId(getCurrentAuthUserId());

		appointment.setActive(true);

		if (appointmentType == SaasAppointmentType.ONLINE) {

			appointment.setStatus(SaasAppointmentStatus.PAYMENT_PENDING);

			appointment.setMeetingUrl(generateMeetingUrl(request.getTenantId(), doctorStaff.getAuthUserId()));

		} else {

			appointment.setStatus(SaasAppointmentStatus.PENDING);
		}

		try {
			SaasAppointment saved = appointmentRepository.saveAndFlush(appointment);

			createAppointmentNotification(saved);

			return toResponse(saved);

		} catch (DataIntegrityViolationException exception) {
			throw handleDatabaseConstraint(exception);
		}
	}

	/*
	 * ========================================================= GET APPOINTMENT
	 * LIST =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasAppointmentResponse> getAppointments(Long tenantId) {
		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		Long currentAuthUserId = getCurrentAuthUserId();

		TenantMember currentMember = getCurrentTenantMember(tenantId, currentAuthUserId);

		List<SaasAppointment> appointments;

		/*
		 * Doctor ko sirf usi doctorAuthUserId ki appointments.
		 */
		if (currentMember.getMemberRole() == TenantMemberRole.DOCTOR) {

			appointments = appointmentRepository
					.findByTenantIdAndDoctorAuthUserIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
							tenantId, currentAuthUserId);

		} else {

			/*
			 * Hospital owner, admin aur authorized non-doctor staff tenant ki complete
			 * appointment list dekh sakte hain.
			 */
			appointments = appointmentRepository
					.findByTenantIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId);
		}

		return appointments.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= GET SINGLE
	 * APPOINTMENT =========================================================
	 */

	@Transactional(readOnly = true)
	public SaasAppointmentResponse getAppointment(Long tenantId, Long appointmentId) {
		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasAppointment appointment = getAppointmentEntity(tenantId, appointmentId);

		validateAppointmentAccess(tenantId, appointment);

		return toResponse(appointment);
	}

	/*
	 * ========================================================= GET APPOINTMENTS
	 * FOR A DOCTOR =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasAppointmentResponse> getDoctorAppointments(Long tenantId, Long doctorAuthUserId) {
		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		if (doctorAuthUserId == null) {
			throw new RuntimeException("doctorAuthUserId is required.");
		}

		Long currentAuthUserId = getCurrentAuthUserId();

		TenantMember currentMember = getCurrentTenantMember(tenantId, currentAuthUserId);

		/*
		 * Doctor query parameter badal kar kisi aur doctor ki appointments access nahi
		 * kar sakta.
		 */
		if (currentMember.getMemberRole() == TenantMemberRole.DOCTOR && !currentAuthUserId.equals(doctorAuthUserId)) {

			throw new AccessDeniedException("You cannot view another doctor's appointments.");
		}

		return appointmentRepository
				.findByTenantIdAndDoctorAuthUserIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId,
						doctorAuthUserId)
				.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= GET APPOINTMENTS
	 * FOR A PATIENT =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasAppointmentResponse> getPatientAppointments(Long tenantId, Long patientId) {
		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		Long currentAuthUserId = getCurrentAuthUserId();

		TenantMember currentMember = getCurrentTenantMember(tenantId, currentAuthUserId);

		List<SaasAppointment> appointments = appointmentRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId,
						patientId);

		/*
		 * Doctor patient endpoint se bhi sirf apni appointments dekh sakta hai.
		 */
		if (currentMember.getMemberRole() == TenantMemberRole.DOCTOR) {

			appointments = appointments.stream()
					.filter(appointment -> currentAuthUserId.equals(appointment.getDoctorAuthUserId())).toList();
		}

		return appointments.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= UPDATE APPOINTMENT
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

		if (appointment.getStatus() == SaasAppointmentStatus.COMPLETED) {

			throw new RuntimeException("Completed appointment cannot be updated.");
		}

		if (appointment.getStatus() == SaasAppointmentStatus.CANCELLED) {

			throw new RuntimeException("Cancelled appointment cannot be updated.");
		}

		if (appointment.getStatus() == SaasAppointmentStatus.REJECTED) {

			throw new RuntimeException("Rejected appointment cannot be updated.");
		}

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		SaasStaff doctorStaff = getAndValidateDoctor(tenantId, request.getDoctorStaffId());

		/*
		 * Doctor login appointment ko kisi doosre doctor ke naam par transfer nahi kar
		 * sakta.
		 */
		validateSelectedDoctorAccess(tenantId, doctorStaff);

		SaasAppointmentType appointmentType = parseAppointmentType(request.getAppointmentType());

		validateOnlineConsultation(appointmentType, doctorStaff);

		validateSlotExistsInAvailability(tenantId, doctorStaff.getAuthUserId(), request.getAppointmentDate(),
				request.getAppointmentTime());

		validateSlotNotAlreadyBooked(tenantId, doctorStaff.getAuthUserId(), request.getAppointmentDate(),
				request.getAppointmentTime(), appointmentId);

		appointment.setPatientId(patient.getId());

		appointment.setDoctorStaffId(doctorStaff.getId());

		appointment.setDoctorAuthUserId(doctorStaff.getAuthUserId());

		appointment.setDoctorName(doctorStaff.getStaffName());

		appointment.setDepartment(doctorStaff.getDepartment());

		appointment.setAppointmentType(appointmentType);

		appointment.setAppointmentDate(request.getAppointmentDate());

		appointment.setAppointmentTime(normalizeTime(request.getAppointmentTime()));

		appointment.setSymptoms(clean(request.getSymptoms()));

		appointment.setNotes(clean(request.getNotes()));

		if (appointmentType == SaasAppointmentType.ONLINE) {

			if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {

				appointment.setMeetingUrl(generateMeetingUrl(tenantId, doctorStaff.getAuthUserId()));
			}

		} else {
			appointment.setMeetingUrl(null);
		}

		appointment.touch();

		try {
			SaasAppointment saved = appointmentRepository.saveAndFlush(appointment);

			return toResponse(saved);

		} catch (DataIntegrityViolationException exception) {
			throw handleDatabaseConstraint(exception);
		}
	}

	/*
	 * ========================================================= UPDATE APPOINTMENT
	 * STATUS =========================================================
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
	 * ========================================================= CANCEL APPOINTMENT
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

		/*
		 * History me appointment visible rahegi.
		 */
		appointment.setActive(true);
		appointment.touch();

		appointmentRepository.save(appointment);

		return new ApiResponse(true, "Appointment cancelled successfully.");
	}

	/*
	 * ========================================================= APPOINTMENT ACCESS
	 * VALIDATION =========================================================
	 */

	private void validateAppointmentAccess(Long tenantId, SaasAppointment appointment) {
		Long currentAuthUserId = getCurrentAuthUserId();

		TenantMember currentMember = getCurrentTenantMember(tenantId, currentAuthUserId);

		/*
		 * Doctor ko sirf assigned appointment access milega.
		 */
		if (currentMember.getMemberRole() == TenantMemberRole.DOCTOR) {

			if (!currentAuthUserId.equals(appointment.getDoctorAuthUserId())) {

				throw new AccessDeniedException("You cannot access another doctor's appointment.");
			}
		}

		/*
		 * OWNER, ADMIN aur other authorized non-doctor tenant members ko access
		 * permissionService ke according milega.
		 */
	}

	private void validateSelectedDoctorAccess(Long tenantId, SaasStaff selectedDoctor) {
		Long currentAuthUserId = getCurrentAuthUserId();

		TenantMember currentMember = getCurrentTenantMember(tenantId, currentAuthUserId);

		if (currentMember.getMemberRole() == TenantMemberRole.DOCTOR
				&& !currentAuthUserId.equals(selectedDoctor.getAuthUserId())) {

			throw new AccessDeniedException("A doctor can create or update only their own appointment.");
		}
	}

	/*
	 * ========================================================= CURRENT USER /
	 * TENANT MEMBER =========================================================
	 */

	private Long getCurrentAuthUserId() {
		Long currentAuthUserId = CurrentUserUtil.getUserId();

		if (currentAuthUserId == null) {
			throw new AccessDeniedException("Logged-in user ID not found.");
		}

		return currentAuthUserId;
	}

	private TenantMember getCurrentTenantMember(Long tenantId, Long authUserId) {
		return tenantMemberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, authUserId)
				.orElseThrow(() -> new AccessDeniedException("You are not an active member of this workspace."));
	}

	/*
	 * ========================================================= DOCTOR VALIDATION
	 * =========================================================
	 */

	private SaasStaff getAndValidateDoctor(Long tenantId, Long doctorStaffId) {
		if (doctorStaffId == null) {
			throw new RuntimeException("Doctor is required.");
		}

		SaasStaff doctorStaff = staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Selected doctor not found."));

		if (doctorStaff.getStaffRole() != SaasStaffRole.DOCTOR) {

			throw new RuntimeException("Selected staff member is not a doctor.");
		}

		if (doctorStaff.getAuthUserId() == null) {
			throw new RuntimeException("Selected doctor's login user is missing.");
		}

		return doctorStaff;
	}

	/*
	 * ========================================================= ONLINE CONSULTATION
	 * VALIDATION =========================================================
	 */

	private void validateOnlineConsultation(SaasAppointmentType appointmentType, SaasStaff doctorStaff) {
		if (appointmentType == SaasAppointmentType.ONLINE
				&& !Boolean.TRUE.equals(doctorStaff.getOnlineConsultationEnabled())) {

			throw new RuntimeException("Online consultation is not enabled for selected doctor.");
		}
	}

	/*
	 * ========================================================= SLOT VALIDATION
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
		List<SaasAppointmentStatus> bookedStatuses = getBookedStatuses();

		LocalTime normalizedTime = normalizeTime(time);

		boolean alreadyBooked;

		if (excludedAppointmentId == null) {

			alreadyBooked = appointmentRepository
					.existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusIn(tenantId,
							doctorAuthUserId, date, normalizedTime, bookedStatuses);

		} else {

			alreadyBooked = appointmentRepository
					.existsByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusInAndIdNot(
							tenantId, doctorAuthUserId, date, normalizedTime, bookedStatuses, excludedAppointmentId);
		}

		if (alreadyBooked) {
			throw new RuntimeException("Selected slot is already booked. Please choose another slot.");
		}
	}

	private List<SaasAppointmentStatus> getBookedStatuses() {
		return List.of(SaasAppointmentStatus.PAYMENT_PENDING, SaasAppointmentStatus.PENDING,
				SaasAppointmentStatus.CONFIRMED, SaasAppointmentStatus.COMPLETED);
	}

	/*
	 * ========================================================= STATUS VALIDATION
	 * =========================================================
	 */

	private SaasAppointmentStatus parseAppointmentStatus(String status) {
		if (status == null || status.isBlank()) {
			throw new RuntimeException("Appointment status is required.");
		}

		try {
			return SaasAppointmentStatus.valueOf(status.trim().toUpperCase());

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid appointment status: " + status);
		}
	}

	private void validateStatusTransition(SaasAppointmentStatus currentStatus, SaasAppointmentStatus newStatus) {
		if (currentStatus == null) {
			return;
		}

		if (currentStatus == SaasAppointmentStatus.COMPLETED) {
			throw new RuntimeException("Completed appointment status cannot be changed.");
		}

		if (currentStatus == SaasAppointmentStatus.CANCELLED) {
			throw new RuntimeException("Cancelled appointment status cannot be changed.");
		}

		if (currentStatus == SaasAppointmentStatus.REJECTED) {
			throw new RuntimeException("Rejected appointment status cannot be changed.");
		}

		if (currentStatus == newStatus) {
			throw new RuntimeException("Appointment already has status " + newStatus.name() + ".");
		}
	}

	/*
	 * ========================================================= GENERAL HELPERS
	 * =========================================================
	 */

	private SaasAppointmentType parseAppointmentType(String appointmentType) {
		if (appointmentType == null || appointmentType.isBlank()) {

			throw new RuntimeException("appointmentType is required.");
		}

		try {
			return SaasAppointmentType.valueOf(appointmentType.trim().toUpperCase());

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid appointment type: " + appointmentType);
		}
	}

	private SaasAppointment getAppointmentEntity(Long tenantId, Long appointmentId) {
		if (appointmentId == null) {
			throw new RuntimeException("Appointment ID is required.");
		}

		return appointmentRepository.findByIdAndTenantIdAndActiveTrue(appointmentId, tenantId)
				.orElseThrow(() -> new RuntimeException("Appointment not found."));
	}

	private void validateRequest(SaasAppointmentRequest request) {
		if (request == null) {
			throw new RuntimeException("Appointment request is required.");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required.");
		}

		if (request.getPatientId() == null) {
			throw new RuntimeException("patientId is required.");
		}

		if (request.getDoctorStaffId() == null) {
			throw new RuntimeException("doctorStaffId is required.");
		}

		parseAppointmentType(request.getAppointmentType());

		if (request.getAppointmentDate() == null) {
			throw new RuntimeException("appointmentDate is required.");
		}

		if (request.getAppointmentDate().isBefore(LocalDate.now())) {

			throw new RuntimeException("Appointment date cannot be in the past.");
		}

		if (request.getAppointmentTime() == null) {
			throw new RuntimeException("appointmentTime is required.");
		}

		LocalTime appointmentTime = normalizeTime(request.getAppointmentTime());

		LocalTime currentTime = normalizeTime(LocalTime.now());

		if (request.getAppointmentDate().equals(LocalDate.now()) && appointmentTime.isBefore(currentTime)) {

			throw new RuntimeException("Appointment time cannot be in the past.");
		}
	}

	private LocalTime normalizeTime(LocalTime time) {
		if (time == null) {
			return null;
		}

		return time.withSecond(0).withNano(0);
	}

	private String generateMeetingUrl(Long tenantId, Long doctorAuthUserId) {
		return "https://meet.jit.si/medirevolution-saas-" + tenantId + "-" + doctorAuthUserId + "-"
				+ System.currentTimeMillis();
	}

	private void createAppointmentNotification(SaasAppointment appointment) {
		notificationService.createSystemNotification(appointment.getTenantId(), SaasNotificationType.APPOINTMENT,
				SaasNotificationPriority.HIGH, "New appointment booked",
				"New appointment has been booked with " + appointment.getDoctorName(), appointment.getId(),
				"APPOINTMENT", "/saas/appointments");
	}

	private RuntimeException handleDatabaseConstraint(DataIntegrityViolationException exception) {
		String rootMessage = exception.getMostSpecificCause() == null ? exception.getMessage()
				: exception.getMostSpecificCause().getMessage();

		if (rootMessage != null && rootMessage.contains("uk_saas_appointment_active_doctor_slot")) {

			return new RuntimeException("Selected slot was just booked by another user. Please choose another slot.");
		}

		System.err.println("Appointment database constraint error: " + rootMessage);

		return new RuntimeException("Unable to save appointment because of a database constraint.");
	}

	private String clean(String value) {
		if (value == null) {
			return null;
		}

		String cleanedValue = value.trim();

		return cleanedValue.isBlank() ? null : cleanedValue;
	}

	/*
	 * ========================================================= RESPONSE MAPPING
	 * =========================================================
	 */

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
}