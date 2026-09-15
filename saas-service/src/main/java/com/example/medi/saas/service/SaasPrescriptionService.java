package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPrescriptionMedicineRequest;
import com.example.medi.saas.dto.SaasPrescriptionMedicineResponse;
import com.example.medi.saas.dto.SaasPrescriptionRequest;
import com.example.medi.saas.dto.SaasPrescriptionResponse;
import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasPrescription;
import com.example.medi.saas.entity.SaasPrescriptionMedicine;
import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStaffRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasPrescriptionMedicineRepository;
import com.example.medi.saas.repository.SaasPrescriptionRepository;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class SaasPrescriptionService {

	private final SaasPrescriptionRepository prescriptionRepository;
	private final SaasPrescriptionMedicineRepository medicineRepository;
	private final SaasPatientRepository patientRepository;
	private final SaasAppointmentRepository appointmentRepository;
	private final SaasStaffRepository staffRepository;

	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final SaasPatientSelfResolverService patientSelfResolverService;

	public SaasPrescriptionService(SaasPrescriptionRepository prescriptionRepository,
			SaasPrescriptionMedicineRepository medicineRepository, SaasPatientRepository patientRepository,
			SaasAppointmentRepository appointmentRepository, SaasStaffRepository staffRepository,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			SaasPatientSelfResolverService patientSelfResolverService) {

		this.prescriptionRepository = prescriptionRepository;

		this.medicineRepository = medicineRepository;

		this.patientRepository = patientRepository;

		this.appointmentRepository = appointmentRepository;

		this.staffRepository = staffRepository;

		this.tenantAccessService = tenantAccessService;

		this.permissionService = permissionService;

		this.patientSelfResolverService = patientSelfResolverService;
	}

	/*
	 * ================================================================ CREATE
	 * ================================================================
	 */

	@Transactional
	public SaasPrescriptionResponse createPrescription(SaasPrescriptionRequest request) {

		validateRequest(request);

		validateWorkspacePermission(request.getTenantId(), SaasPermissionAction.CREATE);

		SaasPatient patient = getPatient(request.getTenantId(), request.getPatientId());

		SaasStaff doctor = getDoctor(request.getTenantId(), request.getDoctorProfileId());

		validateDoctorOwnership(doctor);

		SaasAppointment appointment = validateLinkedAppointment(request, patient, doctor);

		if (appointment != null && prescriptionRepository
				.existsByTenantIdAndAppointmentIdAndActiveTrue(request.getTenantId(), appointment.getId())) {

			throw new RuntimeException(
					"A prescription already exists for this consultation. " + "Please edit the existing prescription.");
		}

		SaasPrescription prescription = new SaasPrescription();

		applyRequest(prescription, request, patient, doctor, appointment);

		prescription.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		prescription.setActive(true);

		SaasPrescription saved = prescriptionRepository.saveAndFlush(prescription);

		replaceMedicines(saved.getTenantId(), saved.getId(), request.getMedicines());

		/*
		 * IMPORTANT:
		 *
		 * Creating a prescription DOES NOT complete the appointment. Consultation
		 * completion belongs to OPD / appointment lifecycle.
		 */

		return toResponse(saved);
	}

	/*
	 * ================================================================ UPDATE
	 * ================================================================
	 */

	@Transactional
	public SaasPrescriptionResponse updatePrescription(Long tenantId, Long prescriptionId,
			SaasPrescriptionRequest request) {

		if (request == null) {

			throw new RuntimeException("Prescription request is required.");
		}

		request.setTenantId(tenantId);

		validateRequest(request);

		validateWorkspacePermission(tenantId, SaasPermissionAction.UPDATE);

		SaasPrescription prescription = getPrescriptionEntity(tenantId, prescriptionId);

		SaasPatient patient = getPatient(tenantId, request.getPatientId());

		SaasStaff doctor = getDoctor(tenantId, request.getDoctorProfileId());

		validateDoctorOwnership(doctor);

		SaasAppointment appointment = validateLinkedAppointmentForUpdate(request, patient, doctor, prescriptionId);

		applyRequest(prescription, request, patient, doctor, appointment);

		prescription.touch();

		SaasPrescription saved = prescriptionRepository.saveAndFlush(prescription);

		replaceMedicines(tenantId, saved.getId(), request.getMedicines());

		return toResponse(saved);
	}

	/*
	 * ================================================================ STAFF LIST /
	 * READ ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasPrescriptionResponse> getPrescriptions(Long tenantId) {

		validateWorkspacePermission(tenantId, SaasPermissionAction.VIEW);

		return prescriptionRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasPrescriptionResponse getPrescription(Long tenantId, Long prescriptionId) {

		validateWorkspacePermission(tenantId, SaasPermissionAction.VIEW);

		return toResponse(getPrescriptionEntity(tenantId, prescriptionId));
	}

	@Transactional(readOnly = true)
	public List<SaasPrescriptionResponse> getPatientEmr(Long tenantId, Long patientId) {

		validateWorkspacePermission(tenantId, SaasPermissionAction.VIEW);

		getPatient(tenantId, patientId);

		return prescriptionRepository.findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(tenantId, patientId)
				.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasPrescriptionResponse> getDoctorPrescriptions(Long tenantId, Long doctorProfileId) {

		validateWorkspacePermission(tenantId, SaasPermissionAction.VIEW);

		SaasStaff doctor = getDoctor(tenantId, doctorProfileId);

		validateDoctorOwnership(doctor);

		return prescriptionRepository
				.findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByCreatedAtDesc(tenantId, doctor.getId()).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasPrescriptionResponse> getAppointmentPrescriptions(Long tenantId, Long appointmentId) {

		validateWorkspacePermission(tenantId, SaasPermissionAction.VIEW);

		appointmentRepository.findByIdAndTenantIdAndActiveTrue(appointmentId, tenantId)
				.orElseThrow(() -> new RuntimeException("Appointment not found."));

		return prescriptionRepository
				.findByTenantIdAndAppointmentIdAndActiveTrueOrderByCreatedAtDesc(tenantId, appointmentId).stream()
				.map(this::toResponse).toList();
	}

	/*
	 * ================================================================ PATIENT
	 * PORTAL ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasPrescriptionResponse> getMyPrescriptions(Long tenantId) {

		requirePatientRole();

		SaasPatient patient = patientSelfResolverService.resolvePatientEntity(tenantId);

		return prescriptionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(tenantId, patient.getId()).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasPrescriptionResponse getMyPrescription(Long tenantId, Long prescriptionId) {

		requirePatientRole();

		SaasPatient patient = patientSelfResolverService.resolvePatientEntity(tenantId);

		SaasPrescription prescription = getPrescriptionEntity(tenantId, prescriptionId);

		if (!patient.getId().equals(prescription.getPatientId())) {

			throw new AccessDeniedException("You cannot access another patient's prescription.");
		}

		return toResponse(prescription);
	}

	/*
	 * ================================================================ DELETE
	 * ================================================================
	 */

	@Transactional
	public ApiResponse deletePrescription(Long tenantId, Long prescriptionId) {

		validateWorkspacePermission(tenantId, SaasPermissionAction.DELETE);

		SaasPrescription prescription = getPrescriptionEntity(tenantId, prescriptionId);

		SaasStaff doctor = getDoctor(tenantId, prescription.getDoctorProfileId());

		validateDoctorOwnership(doctor);

		prescription.setActive(false);

		prescription.touch();

		prescriptionRepository.save(prescription);

		return new ApiResponse(true, "Prescription deleted successfully.");
	}

	/*
	 * ================================================================ REQUEST →
	 * ENTITY ================================================================
	 */

	private void applyRequest(SaasPrescription prescription, SaasPrescriptionRequest request, SaasPatient patient,
			SaasStaff doctor, SaasAppointment appointment) {

		prescription.setTenantId(request.getTenantId());

		prescription.setPatientId(patient.getId());

		/*
		 * Legacy field name retained. Value is canonical SaasStaff.id.
		 */
		prescription.setDoctorProfileId(doctor.getId());

		prescription.setAppointmentId(appointment == null ? null : appointment.getId());

		prescription.setDiagnosis(clean(request.getDiagnosis()));

		prescription.setClinicalNotes(clean(request.getClinicalNotes()));

		prescription.setAdvice(clean(request.getAdvice()));

		prescription.setLabTests(clean(request.getLabTests()));

		prescription.setFollowUpAdvice(clean(request.getFollowUpAdvice()));

		prescription.setFollowUpDate(request.getFollowUpDate());

		prescription.setBloodPressure(clean(request.getBloodPressure()));

		prescription.setPulse(clean(request.getPulse()));

		prescription.setTemperature(clean(request.getTemperature()));

		prescription.setSpo2(clean(request.getSpo2()));

		prescription.setWeight(clean(request.getWeight()));

		prescription.setHeight(clean(request.getHeight()));

		prescription.setSugarLevel(clean(request.getSugarLevel()));
	}

	/*
	 * ================================================================ APPOINTMENT
	 * VALIDATION ================================================================
	 */

	private SaasAppointment validateLinkedAppointment(SaasPrescriptionRequest request, SaasPatient patient,
			SaasStaff doctor) {

		if (request.getAppointmentId() == null) {

			return null;
		}

		SaasAppointment appointment = getAppointment(request.getTenantId(), request.getAppointmentId());

		validateAppointmentIdentity(appointment, patient, doctor);

		if (appointment.getStatus() != SaasAppointmentStatus.IN_CONSULTATION) {

			throw new RuntimeException(
					"Prescription can be created for a linked appointment only while consultation is IN_CONSULTATION.");
		}

		return appointment;
	}

	private SaasAppointment validateLinkedAppointmentForUpdate(SaasPrescriptionRequest request, SaasPatient patient,
			SaasStaff doctor, Long prescriptionId) {

		if (request.getAppointmentId() == null) {

			return null;
		}

		SaasAppointment appointment = getAppointment(request.getTenantId(), request.getAppointmentId());

		validateAppointmentIdentity(appointment, patient, doctor);

		prescriptionRepository.findFirstByTenantIdAndAppointmentIdAndActiveTrueOrderByCreatedAtDesc(
				request.getTenantId(), appointment.getId()).ifPresent(existing -> {

					if (!existing.getId().equals(prescriptionId)) {

						throw new RuntimeException("Another active prescription already exists for this appointment.");
					}
				});

		return appointment;
	}

	private void validateAppointmentIdentity(SaasAppointment appointment, SaasPatient patient, SaasStaff doctor) {

		if (!patient.getId().equals(appointment.getPatientId())) {

			throw new RuntimeException("Selected patient does not match linked appointment.");
		}

		if (!doctor.getId().equals(appointment.getDoctorStaffId())) {

			throw new RuntimeException("Selected doctor does not match linked appointment.");
		}
	}

	/*
	 * ================================================================ MEDICINES
	 * ================================================================
	 */

	private void replaceMedicines(Long tenantId, Long prescriptionId, List<SaasPrescriptionMedicineRequest> medicines) {

		medicineRepository.deleteByTenantIdAndPrescriptionId(tenantId, prescriptionId);

		if (medicines == null || medicines.isEmpty()) {

			return;
		}

		for (SaasPrescriptionMedicineRequest item : medicines) {

			if (item == null || item.getMedicineName() == null || item.getMedicineName().isBlank()) {

				continue;
			}

			SaasPrescriptionMedicine medicine = new SaasPrescriptionMedicine();

			medicine.setTenantId(tenantId);

			medicine.setPrescriptionId(prescriptionId);

			medicine.setMedicineName(item.getMedicineName().trim());

			medicine.setDosage(clean(item.getDosage()));

			medicine.setFrequency(clean(item.getFrequency()));

			medicine.setDuration(clean(item.getDuration()));

			medicine.setInstructions(clean(item.getInstructions()));

			medicineRepository.save(medicine);
		}
	}

	/*
	 * ================================================================ VALIDATION /
	 * ACCESS ================================================================
	 */

	private void validateRequest(SaasPrescriptionRequest request) {

		if (request == null) {

			throw new RuntimeException("Prescription request is required.");
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

		if (request.getDiagnosis() == null || request.getDiagnosis().isBlank()) {

			throw new RuntimeException("Diagnosis is required.");
		}
	}

	private void validateWorkspacePermission(Long tenantId, SaasPermissionAction action) {

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.PRESCRIPTIONS, action);
	}

	private SaasPatient getPatient(Long tenantId, Long patientId) {

		return patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found in selected workspace."));
	}

	private SaasStaff getDoctor(Long tenantId, Long doctorStaffId) {

		SaasStaff doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Doctor not found."));

		if (doctor.getStaffRole() != SaasStaffRole.DOCTOR) {

			throw new RuntimeException("Selected staff member is not a doctor.");
		}

		return doctor;
	}

	private SaasAppointment getAppointment(Long tenantId, Long appointmentId) {

		return appointmentRepository.findByIdAndTenantIdAndActiveTrue(appointmentId, tenantId)
				.orElseThrow(() -> new RuntimeException("Appointment not found in selected workspace."));
	}

	private SaasPrescription getPrescriptionEntity(Long tenantId, Long prescriptionId) {

		return prescriptionRepository.findByIdAndTenantIdAndActiveTrue(prescriptionId, tenantId)
				.orElseThrow(() -> new RuntimeException("Prescription not found."));
	}

	private void validateDoctorOwnership(SaasStaff doctor) {

		String role = normalizeRole(CurrentUserUtil.getRole());

		if ("DOCTOR".equals(role)) {

			Long authUserId = CurrentUserUtil.getUserId();

			if (authUserId == null || !authUserId.equals(doctor.getAuthUserId())) {

				throw new AccessDeniedException("Doctor can manage only their own prescriptions.");
			}
		}
	}

	private void requirePatientRole() {

		if (!"PATIENT".equals(normalizeRole(CurrentUserUtil.getRole()))) {

			throw new AccessDeniedException("Only patient can access this endpoint.");
		}
	}

	private String normalizeRole(String role) {

		if (role == null) {

			return "";
		}

		return role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");
	}

	private String clean(String value) {

		if (value == null) {

			return null;
		}

		String cleanValue = value.trim();

		return cleanValue.isBlank() ? null : cleanValue;
	}

	/*
	 * ================================================================ RESPONSE
	 * ================================================================
	 */

	private SaasPrescriptionResponse toResponse(SaasPrescription prescription) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(prescription.getPatientId(), prescription.getTenantId()).orElse(null);

		SaasStaff doctor = staffRepository
				.findByIdAndTenantIdAndActiveTrue(prescription.getDoctorProfileId(), prescription.getTenantId())
				.orElse(null);

		List<SaasPrescriptionMedicineResponse> medicines = medicineRepository
				.findByTenantIdAndPrescriptionIdOrderByIdAsc(prescription.getTenantId(), prescription.getId()).stream()
				.map(medicine -> new SaasPrescriptionMedicineResponse(

						medicine.getId(),

						medicine.getMedicineName(),

						medicine.getDosage(),

						medicine.getFrequency(),

						medicine.getDuration(),

						medicine.getInstructions()))
				.toList();

		return new SaasPrescriptionResponse(

				prescription.getId(),

				prescription.getTenantId(),

				prescription.getPatientId(),

				patient == null ? null : patient.getPatientCode(),

				patient == null ? null : patient.getPatientName(),

				patient == null ? null : patient.getMobile(),

				prescription.getDoctorProfileId(),

				doctor == null ? null : doctor.getStaffName(),

				doctor == null ? null : doctor.getDepartment(),

				doctor == null ? null : doctor.getSpecialization(),

				prescription.getAppointmentId(),

				prescription.getDiagnosis(),

				prescription.getClinicalNotes(),

				prescription.getAdvice(),

				prescription.getLabTests(),

				prescription.getFollowUpAdvice(),

				prescription.getFollowUpDate(),

				prescription.getBloodPressure(),

				prescription.getPulse(),

				prescription.getTemperature(),

				prescription.getSpo2(),

				prescription.getWeight(),

				prescription.getHeight(),

				prescription.getSugarLevel(),

				medicines,

				prescription.getActive(),

				prescription.getCreatedAt());
	}
}