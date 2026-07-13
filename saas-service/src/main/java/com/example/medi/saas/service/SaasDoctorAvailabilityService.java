package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasDoctorAvailabilityRequest;
import com.example.medi.saas.dto.SaasDoctorAvailabilityResponse;
import com.example.medi.saas.dto.SaasDoctorSlotResponse;
import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.entity.SaasDoctorAvailability;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasAvailabilityStatus;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasDoctorAvailabilityRepository;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class SaasDoctorAvailabilityService {

	private final SaasDoctorAvailabilityRepository availabilityRepository;
	private final SaasAppointmentRepository appointmentRepository;
	private final TenantMemberRepository tenantMemberRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final CurrentUserUtil currentUserService;

	public SaasDoctorAvailabilityService(SaasDoctorAvailabilityRepository availabilityRepository,
			SaasAppointmentRepository appointmentRepository, TenantMemberRepository tenantMemberRepository,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			CurrentUserUtil currentUserService) {
		this.availabilityRepository = availabilityRepository;
		this.appointmentRepository = appointmentRepository;
		this.tenantMemberRepository = tenantMemberRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.currentUserService = currentUserService;
	}

	/*
	 * ========================================================= CREATE AVAILABILITY
	 * =========================================================
	 */

	@Transactional
	public SaasDoctorAvailabilityResponse createAvailability(SaasDoctorAvailabilityRequest request) {
		validateRequest(request);

		tenantAccessService.validateTenantAccess(request.getTenantId());

		permissionService.requirePermission(request.getTenantId(), TenantModule.DOCTOR_AVAILABILITY,
				SaasPermissionAction.CREATE);

		TenantMember doctorMember = validateDoctorBelongsToTenant(request.getTenantId(), request.getDoctorAuthUserId());

		boolean duplicateExists = availabilityRepository
				.existsByTenantIdAndDoctorAuthUserIdAndAvailableDateAndStartTimeAndEndTimeAndStatus(
						request.getTenantId(), request.getDoctorAuthUserId(), request.getAvailableDate(),
						request.getStartTime(), request.getEndTime(), SaasAvailabilityStatus.ACTIVE);

		if (duplicateExists) {
			throw new RuntimeException("Availability already exists for this doctor, date and time.");
		}

		validateNoOverlappingAvailability(request);

		Long currentAuthUserId = currentUserService.getCurrentAuthUserId();

		SaasDoctorAvailability availability = new SaasDoctorAvailability();

		availability.setTenantId(request.getTenantId());

		availability.setDoctorAuthUserId(request.getDoctorAuthUserId());

		if (request.getDoctorName() != null && !request.getDoctorName().isBlank()) {

			availability.setDoctorName(request.getDoctorName().trim());

		} else {
			availability.setDoctorName(doctorMember.getName());
		}

		availability.setAvailableDate(request.getAvailableDate());

		availability.setStartTime(normalizeTime(request.getStartTime()));

		availability.setEndTime(normalizeTime(request.getEndTime()));

		availability.setSlotDurationMinutes(request.getSlotDurationMinutes());

		availability.setStatus(SaasAvailabilityStatus.ACTIVE);

		availability.setCreatedByAuthUserId(currentAuthUserId);

		SaasDoctorAvailability saved = availabilityRepository.save(availability);

		return toResponse(saved);
	}

	/*
	 * ========================================================= GET AVAILABILITY
	 * RECORDS =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasDoctorAvailabilityResponse> getAvailability(Long tenantId, Long doctorAuthUserId, LocalDate date) {
		validateTenantId(tenantId);

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.DOCTOR_AVAILABILITY, SaasPermissionAction.VIEW);

		List<SaasDoctorAvailability> availabilityList;

		if (doctorAuthUserId != null && date != null) {

			availabilityList = availabilityRepository
					.findByTenantIdAndDoctorAuthUserIdAndAvailableDateAndStatusOrderByStartTimeAsc(tenantId,
							doctorAuthUserId, date, SaasAvailabilityStatus.ACTIVE);

		} else if (doctorAuthUserId != null) {

			availabilityList = availabilityRepository
					.findByTenantIdAndDoctorAuthUserIdAndStatusOrderByAvailableDateAscStartTimeAsc(tenantId,
							doctorAuthUserId, SaasAvailabilityStatus.ACTIVE);

		} else if (date != null) {

			availabilityList = availabilityRepository.findByTenantIdAndAvailableDateAndStatusOrderByStartTimeAsc(
					tenantId, date, SaasAvailabilityStatus.ACTIVE);

		} else {
			throw new RuntimeException("Please provide doctorAuthUserId or date.");
		}

		return availabilityList.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= PUBLIC SLOT API
	 * =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasDoctorSlotResponse> getAvailableSlots(Long tenantId, Long doctorAuthUserId, LocalDate date) {
		validateTenantId(tenantId);

		if (doctorAuthUserId == null) {
			throw new RuntimeException("Doctor is required.");
		}

		if (date == null) {
			throw new RuntimeException("Date is required.");
		}

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.DOCTOR_AVAILABILITY, SaasPermissionAction.VIEW);

		return getAvailableSlotsInternal(tenantId, doctorAuthUserId, date);
	}

	/*
	 * ========================================================= INTERNAL SLOT
	 * GENERATION Appointment service bhi isi method ko use karegi.
	 * =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasDoctorSlotResponse> getAvailableSlotsInternal(Long tenantId, Long doctorAuthUserId,
			LocalDate date) {
		validateTenantId(tenantId);

		if (doctorAuthUserId == null) {
			throw new RuntimeException("Doctor is required.");
		}

		if (date == null) {
			throw new RuntimeException("Date is required.");
		}

		/*
		 * Internal method me permission check nahi hai, lekin doctor tenant ka active
		 * member hona chahiye.
		 */
		validateDoctorBelongsToTenant(tenantId, doctorAuthUserId);

		List<SaasDoctorAvailability> availabilityList = availabilityRepository
				.findByTenantIdAndDoctorAuthUserIdAndAvailableDateAndStatusOrderByStartTimeAsc(tenantId,
						doctorAuthUserId, date, SaasAvailabilityStatus.ACTIVE);

		List<SaasDoctorSlotResponse> generatedSlots = generateSlotsFromAvailability(availabilityList);

		Set<String> bookedSlotKeys = getBookedSlotKeys(tenantId, doctorAuthUserId, date);

		for (SaasDoctorSlotResponse slot : generatedSlots) {

			String slotKey = buildSingleTimeKey(slot.getStartTime());

			boolean booked = bookedSlotKeys.contains(slotKey);

			slot.setBooked(booked);
			slot.setAvailable(!booked);
		}

		return generatedSlots;
	}

	/*
	 * ========================================================= INTERNAL SLOT
	 * VALIDATION =========================================================
	 */

	@Transactional(readOnly = true)
	public boolean isSlotAvailableInternal(Long tenantId, Long doctorAuthUserId, LocalDate date, LocalTime time) {
		if (tenantId == null || doctorAuthUserId == null || date == null || time == null) {

			return false;
		}

		List<SaasDoctorSlotResponse> slots = getAvailableSlotsInternal(tenantId, doctorAuthUserId, date);

		LocalTime requestedTime = normalizeTime(time);

		return slots.stream().anyMatch(
				slot -> slot.getStartTime() != null && normalizeTime(slot.getStartTime()).equals(requestedTime)
						&& Boolean.TRUE.equals(slot.getAvailable()) && !Boolean.TRUE.equals(slot.getBooked()));
	}

	/*
	 * ========================================================= DELETE / DEACTIVATE
	 * AVAILABILITY =========================================================
	 */

	@Transactional
	public void deleteAvailability(Long tenantId, Long availabilityId) {
		validateTenantId(tenantId);

		if (availabilityId == null) {
			throw new RuntimeException("Availability id is required.");
		}

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.DOCTOR_AVAILABILITY, SaasPermissionAction.DELETE);

		SaasDoctorAvailability availability = availabilityRepository.findById(availabilityId)
				.orElseThrow(() -> new RuntimeException("Availability not found."));

		if (!tenantId.equals(availability.getTenantId())) {
			throw new RuntimeException("Availability does not belong to selected workspace.");
		}

		availability.setStatus(SaasAvailabilityStatus.INACTIVE);

		availability.setUpdatedByAuthUserId(currentUserService.getCurrentAuthUserId());

		availabilityRepository.save(availability);
	}

	/*
	 * ========================================================= REQUEST VALIDATION
	 * =========================================================
	 */

	private void validateRequest(SaasDoctorAvailabilityRequest request) {
		if (request == null) {
			throw new RuntimeException("Availability request is required.");
		}

		validateTenantId(request.getTenantId());

		if (request.getDoctorAuthUserId() == null) {
			throw new RuntimeException("Doctor is required.");
		}

		if (request.getAvailableDate() == null) {
			throw new RuntimeException("Available date is required.");
		}

		if (request.getAvailableDate().isBefore(LocalDate.now())) {

			throw new RuntimeException("Availability date cannot be in the past.");
		}

		if (request.getStartTime() == null) {
			throw new RuntimeException("Start time is required.");
		}

		if (request.getEndTime() == null) {
			throw new RuntimeException("End time is required.");
		}

		if (!request.getEndTime().isAfter(request.getStartTime())) {

			throw new RuntimeException("End time must be after start time.");
		}

		if (request.getSlotDurationMinutes() == null || request.getSlotDurationMinutes() <= 0) {

			throw new RuntimeException("Slot duration is required.");
		}

		List<Integer> allowedDurations = List.of(5, 10, 15, 20, 30, 45, 60);

		if (!allowedDurations.contains(request.getSlotDurationMinutes())) {
			throw new RuntimeException("Invalid slot duration. Allowed: 5, 10, 15, 20, 30, 45, 60 minutes.");
		}

		long totalMinutes = Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();

		if (totalMinutes < request.getSlotDurationMinutes()) {

			throw new RuntimeException("Time range must be greater than or equal to slot duration.");
		}

		if (totalMinutes % request.getSlotDurationMinutes() != 0) {

			throw new RuntimeException("Time range must be exactly divisible by slot duration.");
		}
	}

	private void validateTenantId(Long tenantId) {
		if (tenantId == null) {
			throw new RuntimeException("Tenant id is required.");
		}
	}

	/*
	 * ========================================================= DOCTOR TENANT
	 * VALIDATION =========================================================
	 */

	private TenantMember validateDoctorBelongsToTenant(Long tenantId, Long doctorAuthUserId) {
		TenantMember member = tenantMemberRepository
				.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, doctorAuthUserId)
				.orElseThrow(() -> new RuntimeException("Selected doctor is not a member of this workspace."));

		if (member.getMemberRole() != TenantMemberRole.DOCTOR) {

			throw new RuntimeException("Selected member is not a doctor.");
		}

		return member;
	}

	/*
	 * ========================================================= OVERLAPPING
	 * AVAILABILITY CHECK =========================================================
	 */

	private void validateNoOverlappingAvailability(SaasDoctorAvailabilityRequest request) {
		List<SaasDoctorAvailability> existingRecords = availabilityRepository
				.findByTenantIdAndDoctorAuthUserIdAndAvailableDateAndStatusOrderByStartTimeAsc(request.getTenantId(),
						request.getDoctorAuthUserId(), request.getAvailableDate(), SaasAvailabilityStatus.ACTIVE);

		LocalTime requestedStart = normalizeTime(request.getStartTime());

		LocalTime requestedEnd = normalizeTime(request.getEndTime());

		boolean overlapExists = existingRecords.stream().anyMatch(existing -> {

			LocalTime existingStart = normalizeTime(existing.getStartTime());

			LocalTime existingEnd = normalizeTime(existing.getEndTime());

			return requestedStart.isBefore(existingEnd) && requestedEnd.isAfter(existingStart);
		});

		if (overlapExists) {
			throw new RuntimeException("Doctor already has overlapping availability for the selected date and time.");
		}
	}

	/*
	 * ========================================================= SLOT GENERATION
	 * =========================================================
	 */

	private List<SaasDoctorSlotResponse> generateSlotsFromAvailability(List<SaasDoctorAvailability> availabilityList) {
		List<SaasDoctorSlotResponse> slots = new ArrayList<>();

		if (availabilityList == null || availabilityList.isEmpty()) {

			return slots;
		}

		for (SaasDoctorAvailability availability : availabilityList) {

			Integer duration = availability.getSlotDurationMinutes();

			if (duration == null || duration <= 0) {
				duration = 15;
			}

			LocalTime currentStart = normalizeTime(availability.getStartTime());

			LocalTime availabilityEnd = normalizeTime(availability.getEndTime());

			while (currentStart.plusMinutes(duration).compareTo(availabilityEnd) <= 0) {

				LocalTime currentEnd = currentStart.plusMinutes(duration);

				SaasDoctorSlotResponse slot = new SaasDoctorSlotResponse();

				slot.setStartTime(currentStart);
				slot.setEndTime(currentEnd);

				slot.setLabel(formatSlotLabel(currentStart, currentEnd));

				slot.setAvailable(true);
				slot.setBooked(false);

				slots.add(slot);

				currentStart = currentEnd;
			}
		}

		return slots;
	}

	/*
	 * ========================================================= BOOKED APPOINTMENT
	 * SLOT KEYS =========================================================
	 */

	private Set<String> getBookedSlotKeys(Long tenantId, Long doctorAuthUserId, LocalDate date) {
		List<SaasAppointmentStatus> bookedStatuses = List.of(SaasAppointmentStatus.PENDING,
				SaasAppointmentStatus.CONFIRMED, SaasAppointmentStatus.COMPLETED,
				SaasAppointmentStatus.PAYMENT_PENDING);

		List<SaasAppointment> appointments = appointmentRepository
				.findByTenantIdAndDoctorAuthUserIdAndAppointmentDateAndStatusIn(tenantId, doctorAuthUserId, date,
						bookedStatuses);

		Set<String> bookedSlotKeys = new HashSet<>();

		for (SaasAppointment appointment : appointments) {

			if (appointment.getAppointmentTime() != null) {

				bookedSlotKeys.add(buildSingleTimeKey(appointment.getAppointmentTime()));
			}
		}

		return bookedSlotKeys;
	}

	private String buildSingleTimeKey(LocalTime startTime) {
		if (startTime == null) {
			return "";
		}

		return normalizeTime(startTime) + "_SINGLE";
	}

	private LocalTime normalizeTime(LocalTime time) {
		if (time == null) {
			return null;
		}

		return time.withSecond(0).withNano(0);
	}

	private String formatSlotLabel(LocalTime startTime, LocalTime endTime) {
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("hh:mm a");

		return startTime.format(formatter) + " - " + endTime.format(formatter);
	}

	/*
	 * ========================================================= RESPONSE MAPPING
	 * =========================================================
	 */

	private SaasDoctorAvailabilityResponse toResponse(SaasDoctorAvailability availability) {
		SaasDoctorAvailabilityResponse response = new SaasDoctorAvailabilityResponse();

		response.setId(availability.getId());

		response.setTenantId(availability.getTenantId());

		response.setDoctorAuthUserId(availability.getDoctorAuthUserId());

		response.setDoctorName(availability.getDoctorName());

		response.setAvailableDate(availability.getAvailableDate());

		response.setStartTime(availability.getStartTime());

		response.setEndTime(availability.getEndTime());

		response.setSlotDurationMinutes(availability.getSlotDurationMinutes());

		response.setStatus(availability.getStatus());

		response.setCreatedByAuthUserId(availability.getCreatedByAuthUserId());

		response.setUpdatedByAuthUserId(availability.getUpdatedByAuthUserId());

		response.setCreatedAt(availability.getCreatedAt());

		response.setUpdatedAt(availability.getUpdatedAt());

		return response;
	}
}