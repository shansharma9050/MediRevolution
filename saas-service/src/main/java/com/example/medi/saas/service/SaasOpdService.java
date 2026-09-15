package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasOpdVisitRequest;
import com.example.medi.saas.dto.SaasOpdVisitResponse;
import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.entity.SaasOpdVisit;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasOpdStatus;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStaffRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasOpdVisitRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
public class SaasOpdService {

	private final SaasOpdVisitRepository opdRepository;
	private final SaasPatientRepository patientRepository;
	private final SaasAppointmentRepository appointmentRepository;
	private final SaasStaffRepository staffRepository;

	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasAppointmentLifecycleService appointmentLifecycleService;

	public SaasOpdService(SaasOpdVisitRepository opdRepository, SaasPatientRepository patientRepository,
			SaasAppointmentRepository appointmentRepository, SaasStaffRepository staffRepository,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			SaasAppointmentLifecycleService appointmentLifecycleService) {

		this.opdRepository = opdRepository;
		this.patientRepository = patientRepository;
		this.appointmentRepository = appointmentRepository;
		this.staffRepository = staffRepository;

		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.appointmentLifecycleService = appointmentLifecycleService;
	}

	/*
	 * ================================================================ CREATE OPD
	 * CONSULTATION ================================================================
	 */

	@Transactional
	public SaasOpdVisitResponse createOpdVisit(SaasOpdVisitRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.OPD, SaasPermissionAction.CREATE);

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found in selected workspace."));

		SaasStaff doctor = getDoctor(tenantId, request.getDoctorProfileId());

		validateDoctorOwnership(doctor);

		SaasAppointment appointment = null;

		if (request.getAppointmentId() != null) {

			appointment = validateConsultationAppointment(request, patient, doctor);

			if (opdRepository.existsByTenantIdAndAppointmentIdAndActiveTrue(tenantId, appointment.getId())) {

				throw new RuntimeException("An OPD consultation already exists for this appointment.");
			}
		}

		SaasOpdVisit opd = new SaasOpdVisit();

		opd.setTenantId(tenantId);

		opd.setPatientId(patient.getId());

		/*
		 * Legacy field name doctorProfileId is retained for DB/API compatibility. The
		 * value is SaasStaff.id.
		 */
		opd.setDoctorProfileId(doctor.getId());

		opd.setAppointmentId(appointment == null ? null : appointment.getId());

		opd.setSymptoms(clean(request.getSymptoms()));

		opd.setDiagnosis(clean(request.getDiagnosis()));

		opd.setNotes(clean(request.getNotes()));

		opd.setConsultationFee(request.getConsultationFee() == null ? BigDecimal.ZERO : request.getConsultationFee());

		opd.setStatus(SaasOpdStatus.OPEN);

		opd.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		opd.setActive(true);

		SaasOpdVisit saved = opdRepository.saveAndFlush(opd);

		saved.setOpdNumber(generateOpdNumber(saved));

		return toResponse(opdRepository.save(saved));
	}

	/*
	 * ================================================================ LIST
	 * ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasOpdVisitResponse> getOpdVisits(Long tenantId) {

		validateTenantAccess(tenantId, SaasPermissionAction.VIEW);

		return opdRepository.findByTenantIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasOpdVisitResponse> getPatientOpdHistory(Long tenantId, Long patientId) {

		validateTenantAccess(tenantId, SaasPermissionAction.VIEW);

		patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		return opdRepository.findByTenantIdAndPatientIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId, patientId)
				.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasOpdVisitResponse> getDoctorOpdVisits(Long tenantId, Long doctorProfileId) {

		validateTenantAccess(tenantId, SaasPermissionAction.VIEW);

		SaasStaff doctor = getDoctor(tenantId, doctorProfileId);

		validateDoctorOwnership(doctor);

		return opdRepository
				.findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId, doctor.getId())
				.stream().map(this::toResponse).toList();
	}

	/*
	 * ================================================================ COMPLETE
	 * CONSULTATION ================================================================
	 */

	@Transactional
	public SaasOpdVisitResponse completeOpd(Long tenantId, Long opdId) {

		validateTenantAccess(tenantId, SaasPermissionAction.UPDATE);

		SaasOpdVisit opd = getOpd(tenantId, opdId);

		if (opd.getStatus() != SaasOpdStatus.OPEN) {

			throw new RuntimeException("Only an OPEN OPD consultation can be completed.");
		}

		SaasStaff doctor = getDoctor(tenantId, opd.getDoctorProfileId());

		validateDoctorOwnership(doctor);

		if (opd.getDiagnosis() == null || opd.getDiagnosis().isBlank()) {

			throw new RuntimeException("Diagnosis is required before completing OPD consultation.");
		}

		/*
		 * Appointment lifecycle remains the single source of truth.
		 *
		 * We no longer manipulate appointment.status directly.
		 */
		if (opd.getAppointmentId() != null) {

			SaasAppointment appointment = appointmentRepository
					.findByIdAndTenantIdAndActiveTrue(opd.getAppointmentId(), tenantId)
					.orElseThrow(() -> new RuntimeException("Linked appointment not found."));

			if (appointment.getStatus() != SaasAppointmentStatus.IN_CONSULTATION) {

				throw new RuntimeException("Linked appointment must be IN_CONSULTATION before completing OPD.");
			}

			appointmentLifecycleService.updateStatus(tenantId, appointment.getId(),
					SaasAppointmentStatus.COMPLETED.name());
		}

		opd.setStatus(SaasOpdStatus.COMPLETED);

		opd.touch();

		return toResponse(opdRepository.save(opd));
	}

	/*
	 * ================================================================ CANCEL
	 * ================================================================
	 */

	@Transactional
	public ApiResponse cancelOpd(Long tenantId, Long opdId) {

		validateTenantAccess(tenantId, SaasPermissionAction.DELETE);

		SaasOpdVisit opd = getOpd(tenantId, opdId);

		if (opd.getStatus() == SaasOpdStatus.COMPLETED) {

			throw new RuntimeException("Completed OPD consultation cannot be deleted.");
		}

		SaasStaff doctor = getDoctor(tenantId, opd.getDoctorProfileId());

		validateDoctorOwnership(doctor);

		opd.setStatus(SaasOpdStatus.CANCELLED);

		opd.setActive(false);

		opd.touch();

		opdRepository.save(opd);

		return new ApiResponse(true, "OPD visit cancelled successfully.");
	}

	/*
	 * ================================================================ APPOINTMENT
	 * VALIDATION ================================================================
	 */

	private SaasAppointment validateConsultationAppointment(SaasOpdVisitRequest request, SaasPatient patient,
			SaasStaff doctor) {

		SaasAppointment appointment = appointmentRepository
				.findByIdAndTenantIdAndActiveTrue(request.getAppointmentId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Appointment not found in selected workspace."));

		if (!patient.getId().equals(appointment.getPatientId())) {

			throw new RuntimeException("Selected patient does not match the linked appointment.");
		}

		if (!doctor.getId().equals(appointment.getDoctorStaffId())) {

			throw new RuntimeException("Selected doctor does not match the linked appointment.");
		}

		if (appointment.getStatus() != SaasAppointmentStatus.IN_CONSULTATION) {

			throw new RuntimeException("Start the appointment consultation before creating linked OPD.");
		}

		return appointment;
	}

	/*
	 * ================================================================ HELPERS
	 * ================================================================
	 */

	private void validateTenantAccess(Long tenantId, SaasPermissionAction action) {

		if (tenantId == null) {

			throw new RuntimeException("tenantId is required.");
		}

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.OPD, action);
	}

	private SaasOpdVisit getOpd(Long tenantId, Long opdId) {

		return opdRepository.findByIdAndTenantIdAndActiveTrue(opdId, tenantId)
				.orElseThrow(() -> new RuntimeException("OPD visit not found."));
	}

	private SaasStaff getDoctor(Long tenantId, Long doctorStaffId) {

		SaasStaff doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Doctor not found."));

		if (doctor.getStaffRole() != SaasStaffRole.DOCTOR) {

			throw new RuntimeException("Selected staff member is not a doctor.");
		}

		return doctor;
	}

	private void validateDoctorOwnership(SaasStaff doctor) {

		String role = normalizeRole(CurrentUserUtil.getRole());

		if ("PATIENT".equals(role)) {

			throw new AccessDeniedException("Patient cannot manage OPD consultation.");
		}

		if ("DOCTOR".equals(role)) {

			Long currentAuthUserId = CurrentUserUtil.getUserId();

			if (currentAuthUserId == null || !currentAuthUserId.equals(doctor.getAuthUserId())) {

				throw new AccessDeniedException("Doctor can manage only their own OPD consultation.");
			}
		}
	}

	private void validateRequest(SaasOpdVisitRequest request) {

		if (request == null) {

			throw new RuntimeException("OPD request is required.");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required.");
		}

		if (request.getPatientId() == null) {

			throw new RuntimeException("patientId is required.");
		}

		if (request.getDoctorProfileId() == null) {

			throw new RuntimeException("doctorProfileId is required.");
		}

		if (request.getConsultationFee() != null && request.getConsultationFee().signum() < 0) {

			throw new RuntimeException("Consultation fee cannot be negative.");
		}
	}

	private String generateOpdNumber(SaasOpdVisit opd) {

		return "OPD-" + opd.getTenantId() + "-" + String.format("%05d", opd.getId());
	}

	private String clean(String value) {

		if (value == null) {

			return null;
		}

		String result = value.trim();

		return result.isBlank() ? null : result;
	}

	private String normalizeRole(String role) {

		if (role == null) {

			return "";
		}

		return role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");
	}

	private SaasOpdVisitResponse toResponse(SaasOpdVisit opd) {

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(opd.getPatientId(), opd.getTenantId())
				.orElse(null);

		SaasStaff doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(opd.getDoctorProfileId(), opd.getTenantId())
				.orElse(null);

		return new SaasOpdVisitResponse(

				opd.getId(),

				opd.getTenantId(),

				opd.getOpdNumber(),

				opd.getPatientId(),

				patient == null ? null : patient.getPatientName(),

				patient == null ? null : patient.getMobile(),

				opd.getDoctorProfileId(),

				doctor == null ? null : doctor.getStaffName(),

				doctor == null ? null : doctor.getDepartment(),

				opd.getAppointmentId(),

				opd.getVisitDateTime(),

				opd.getSymptoms(),

				opd.getDiagnosis(),

				opd.getNotes(),

				opd.getConsultationFee(),

				opd.getStatus().name(),

				opd.getActive(),

				opd.getCreatedAt());
	}
}