package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.SaasBedStatus;
import com.example.medi.saas.enums.SaasIpdChargeType;
import com.example.medi.saas.enums.SaasIpdStatus;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStaffRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class SaasIpdService {

	private final SaasWardRepository wardRepository;
	private final SaasBedRepository bedRepository;
	private final SaasIpdAdmissionRepository admissionRepository;
	private final SaasIpdDailyNoteRepository dailyNoteRepository;
	private final SaasIpdChargeRepository chargeRepository;
	private final SaasPatientRepository patientRepository;
	private final SaasStaffRepository staffRepository;

	private final TenantAccessService tenantAccessService;
	private final SaasNotificationService notificationService;
	private final SaasPermissionService permissionService;

	public SaasIpdService(SaasWardRepository wardRepository, SaasBedRepository bedRepository,
			SaasIpdAdmissionRepository admissionRepository, SaasIpdDailyNoteRepository dailyNoteRepository,
			SaasIpdChargeRepository chargeRepository, SaasPatientRepository patientRepository,
			TenantAccessService tenantAccessService, SaasNotificationService notificationService,
			SaasPermissionService permissionService, SaasStaffRepository staffRepository) {

		this.wardRepository = wardRepository;

		this.bedRepository = bedRepository;

		this.admissionRepository = admissionRepository;

		this.dailyNoteRepository = dailyNoteRepository;

		this.chargeRepository = chargeRepository;

		this.patientRepository = patientRepository;

		this.tenantAccessService = tenantAccessService;

		this.notificationService = notificationService;

		this.permissionService = permissionService;

		this.staffRepository = staffRepository;
	}

	/*
	 * ================================================================ WARDS
	 * ================================================================
	 */

	@Transactional
	public SaasWardResponse createWard(SaasWardRequest request) {

		if (request == null) {

			throw new RuntimeException("Ward request is required.");
		}

		requirePermission(request.getTenantId(), SaasPermissionAction.CREATE);

		if (request.getWardName() == null || request.getWardName().isBlank()) {

			throw new RuntimeException("Ward name is required.");
		}

		String wardName = request.getWardName().trim();

		boolean duplicateWard = wardRepository.findByTenantIdAndActiveTrueOrderByWardNameAsc(request.getTenantId())
				.stream().anyMatch(existing -> existing.getWardName() != null
						&& existing.getWardName().trim().equalsIgnoreCase(wardName));

		if (duplicateWard) {

			throw new RuntimeException("Ward already exists in this workspace.");
		}

		SaasWard ward = new SaasWard();

		ward.setTenantId(request.getTenantId());

		ward.setWardName(wardName);

		ward.setWardType(request.getWardType());

		ward.setDescription(trimToNull(request.getDescription()));

		ward.setActive(true);

		return toWardResponse(wardRepository.save(ward));
	}

	@Transactional(readOnly = true)
	public List<SaasWardResponse> getWards(Long tenantId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return wardRepository.findByTenantIdAndActiveTrueOrderByWardNameAsc(tenantId).stream().map(this::toWardResponse)
				.toList();
	}

	/*
	 * ================================================================ BEDS
	 * ================================================================
	 */

	@Transactional
	public SaasBedResponse createBed(SaasBedRequest request) {

		if (request == null) {

			throw new RuntimeException("Bed request is required.");
		}

		requirePermission(request.getTenantId(), SaasPermissionAction.CREATE);

		if (request.getWardId() == null) {

			throw new RuntimeException("wardId is required.");
		}

		if (request.getBedNumber() == null || request.getBedNumber().isBlank()) {

			throw new RuntimeException("Bed number is required.");
		}

		if (request.getDailyCharge() != null && request.getDailyCharge().signum() < 0) {

			throw new RuntimeException("Daily bed charge cannot be negative.");
		}

		SaasWard ward = getWard(request.getTenantId(), request.getWardId());

		String bedNumber = request.getBedNumber().trim();

		if (bedRepository.existsByTenantIdAndWardIdAndBedNumberIgnoreCase(request.getTenantId(), ward.getId(),
				bedNumber)) {

			throw new RuntimeException("Bed number already exists in this ward.");
		}

		SaasBed bed = new SaasBed();

		bed.setTenantId(request.getTenantId());

		bed.setWardId(ward.getId());

		bed.setBedNumber(bedNumber);

		bed.setDailyCharge(request.getDailyCharge() == null ? BigDecimal.ZERO : request.getDailyCharge());

		bed.setStatus(SaasBedStatus.AVAILABLE);

		bed.setActive(true);

		return toBedResponse(bedRepository.save(bed));
	}

	@Transactional(readOnly = true)
	public List<SaasBedResponse> getBeds(Long tenantId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return bedRepository.findByTenantIdAndActiveTrueOrderByBedNumberAsc(tenantId).stream().map(this::toBedResponse)
				.toList();
	}

	@Transactional(readOnly = true)
	public List<SaasBedResponse> getAvailableBeds(Long tenantId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return bedRepository.findByTenantIdAndStatusAndActiveTrueOrderByBedNumberAsc(tenantId, SaasBedStatus.AVAILABLE)
				.stream().map(this::toBedResponse).toList();
	}

	/*
	 * ================================================================ ADMISSION
	 * ================================================================
	 */

	@Transactional
	public SaasIpdAdmissionResponse admitPatient(SaasIpdAdmissionRequest request) {

		validateAdmissionRequest(request);

		requirePermission(request.getTenantId(), SaasPermissionAction.CREATE);

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Patient not found."));

		/*
		 * One active IPD admission per patient.
		 */

		if (admissionRepository.existsByTenantIdAndPatientIdAndStatusAndActiveTrue(request.getTenantId(),
				patient.getId(), SaasIpdStatus.ADMITTED)) {

			throw new RuntimeException("Patient already has an active IPD admission.");
		}

		SaasStaff doctor = getActiveDoctorStaff(request.getDoctorProfileId(), request.getTenantId());

		validateDoctorOwnership(doctor);

		if (doctor.getAuthUserId() == null) {

			throw new RuntimeException("Selected doctor's login user is missing.");
		}

		SaasWard ward = getWard(request.getTenantId(), request.getWardId());

		/*
		 * PESSIMISTIC WRITE LOCK prevents simultaneous allocation.
		 */

		SaasBed bed = bedRepository.findForUpdate(request.getBedId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Bed not found."));

		validateBedForWard(bed, ward);

		ensureBedAvailable(bed);

		if (admissionRepository.existsByTenantIdAndBedIdAndStatusAndActiveTrue(request.getTenantId(), bed.getId(),
				SaasIpdStatus.ADMITTED)) {

			throw new RuntimeException("Selected bed already has an admitted patient.");
		}

		if (request.getAdvanceAmount() != null && request.getAdvanceAmount().signum() < 0) {

			throw new RuntimeException("Advance amount cannot be negative.");
		}

		SaasIpdAdmission admission = new SaasIpdAdmission();

		admission.setTenantId(request.getTenantId());

		admission.setPatientId(patient.getId());

		/*
		 * Historical property name. Value = canonical SaasStaff.id.
		 */
		admission.setDoctorProfileId(doctor.getId());

		admission.setWardId(ward.getId());

		admission.setBedId(bed.getId());

		admission.setReasonForAdmission(trimToNull(request.getReasonForAdmission()));

		admission.setProvisionalDiagnosis(trimToNull(request.getProvisionalDiagnosis()));

		admission.setAdvanceAmount(request.getAdvanceAmount() == null ? BigDecimal.ZERO : request.getAdvanceAmount());

		admission.setTotalCharges(BigDecimal.ZERO);

		admission.setStatus(SaasIpdStatus.ADMITTED);

		admission.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		admission.setActive(true);

		SaasIpdAdmission saved = admissionRepository.saveAndFlush(admission);

		saved.setIpdNumber(generateIpdNumber(saved));

		saved = admissionRepository.save(saved);

		bed.setStatus(SaasBedStatus.OCCUPIED);

		bed.touch();

		bedRepository.save(bed);

		notificationService.createSystemNotification(

				saved.getTenantId(),

				SaasNotificationType.IPD,

				SaasNotificationPriority.MEDIUM,

				"Patient admitted",

				"Patient admitted. IPD No: " + saved.getIpdNumber(),

				saved.getId(),

				"IPD_ADMISSION",

				"/saas/ipd");

		return toAdmissionResponse(saved);
	}

	/*
	 * ================================================================ ADMISSION
	 * LIST / HISTORY
	 * ================================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasIpdAdmissionResponse> getAdmissions(Long tenantId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return admissionRepository.findByTenantIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId).stream()
				.map(this::toAdmissionResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasIpdAdmissionResponse> getPatientIpdHistory(Long tenantId, Long patientId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return admissionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId, patientId).stream()
				.map(this::toAdmissionResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasIpdAdmissionResponse getAdmission(Long tenantId, Long admissionId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		return toAdmissionResponse(getAdmissionEntity(tenantId, admissionId));
	}

	/*
	 * ================================================================ BED TRANSFER
	 * ================================================================
	 */

	@Transactional
	public SaasIpdAdmissionResponse transferBed(Long admissionId, SaasIpdBedTransferRequest request) {

		if (request == null) {

			throw new RuntimeException("Bed transfer request is required.");
		}

		requirePermission(request.getTenantId(), SaasPermissionAction.UPDATE);

		if (request.getWardId() == null || request.getBedId() == null) {

			throw new RuntimeException("Target ward and bed are required.");
		}

		SaasIpdAdmission admission = getActiveAdmission(request.getTenantId(), admissionId);

		SaasStaff doctor = getActiveDoctorStaff(admission.getDoctorProfileId(), request.getTenantId());

		validateDoctorOwnership(doctor);

		if (admission.getBedId().equals(request.getBedId())) {

			throw new RuntimeException("Patient is already assigned to selected bed.");
		}

		SaasWard targetWard = getWard(request.getTenantId(), request.getWardId());

		SaasBed targetBed = bedRepository.findForUpdate(request.getBedId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Target bed not found."));

		validateBedForWard(targetBed, targetWard);

		ensureBedAvailable(targetBed);

		if (admissionRepository.existsByTenantIdAndBedIdAndStatusAndActiveTrue(request.getTenantId(), targetBed.getId(),
				SaasIpdStatus.ADMITTED)) {

			throw new RuntimeException("Target bed is already occupied.");
		}

		SaasBed currentBed = bedRepository.findForUpdate(admission.getBedId(), request.getTenantId())
				.orElseThrow(() -> new RuntimeException("Current bed not found."));

		currentBed.setStatus(SaasBedStatus.AVAILABLE);

		currentBed.touch();

		targetBed.setStatus(SaasBedStatus.OCCUPIED);

		targetBed.touch();

		bedRepository.save(currentBed);

		bedRepository.save(targetBed);

		admission.setWardId(targetWard.getId());

		admission.setBedId(targetBed.getId());

		admission.touch();

		return toAdmissionResponse(admissionRepository.save(admission));
	}

	/*
	 * ================================================================ DISCHARGE
	 * ================================================================
	 */

	@Transactional
	public SaasIpdAdmissionResponse dischargePatient(Long admissionId, SaasIpdDischargeRequest request) {

		if (request == null) {

			throw new RuntimeException("Discharge request is required.");
		}

		requirePermission(request.getTenantId(), SaasPermissionAction.UPDATE);

		SaasIpdAdmission admission = getActiveAdmission(request.getTenantId(), admissionId);

		SaasStaff doctor = getActiveDoctorStaff(admission.getDoctorProfileId(), request.getTenantId());

		validateDoctorOwnership(doctor);

		if (request.getDischargeSummary() == null || request.getDischargeSummary().isBlank()) {

			throw new RuntimeException("Discharge summary is required.");
		}

		/*
		 * Lock current bed while releasing it.
		 */

		SaasBed bed = bedRepository.findForUpdate(admission.getBedId(), admission.getTenantId())
				.orElseThrow(() -> new RuntimeException("Assigned bed not found."));

		admission.setDischargeDateTime(LocalDateTime.now());

		admission.setDischargeSummary(request.getDischargeSummary().trim());

		admission.setDischargeAdvice(trimToNull(request.getDischargeAdvice()));

		admission.setStatus(SaasIpdStatus.DISCHARGED);

		admission.touch();

		SaasIpdAdmission saved = admissionRepository.save(admission);

		bed.setStatus(SaasBedStatus.AVAILABLE);

		bed.touch();

		bedRepository.save(bed);

		notificationService.createSystemNotification(

				saved.getTenantId(),

				SaasNotificationType.IPD,

				SaasNotificationPriority.MEDIUM,

				"Patient discharged",

				"IPD patient discharged. IPD No: " + saved.getIpdNumber(),

				saved.getId(),

				"IPD_ADMISSION",

				"/saas/ipd");

		return toAdmissionResponse(saved);
	}

	/*
	 * ================================================================ DAILY
	 * CLINICAL NOTES
	 * ================================================================
	 */

	@Transactional
	public SaasIpdDailyNoteResponse addDailyNote(SaasIpdDailyNoteRequest request) {

		if (request == null) {

			throw new RuntimeException("Daily note request is required.");
		}

		requirePermission(request.getTenantId(), SaasPermissionAction.UPDATE);

		if (request.getAdmissionId() == null) {

			throw new RuntimeException("admissionId is required.");
		}

		if (request.getDoctorProfileId() == null) {

			throw new RuntimeException("doctorProfileId is required.");
		}

		if (request.getProgressNote() == null || request.getProgressNote().isBlank()) {

			throw new RuntimeException("Progress note is required.");
		}

		SaasIpdAdmission admission = getActiveAdmission(request.getTenantId(), request.getAdmissionId());

		SaasStaff doctor = getActiveDoctorStaff(request.getDoctorProfileId(), request.getTenantId());

		if (!doctor.getId().equals(admission.getDoctorProfileId())) {

			throw new RuntimeException("Selected doctor is not assigned to this admission.");
		}

		validateDoctorOwnership(doctor);

		SaasIpdDailyNote note = new SaasIpdDailyNote();

		note.setTenantId(request.getTenantId());

		note.setAdmissionId(admission.getId());

		note.setDoctorProfileId(doctor.getId());

		note.setProgressNote(request.getProgressNote().trim());

		note.setTreatmentPlan(trimToNull(request.getTreatmentPlan()));

		note.setVitals(trimToNull(request.getVitals()));

		note.setBloodPressure(trimToNull(request.getBloodPressure()));

		note.setPulse(trimToNull(request.getPulse()));

		note.setTemperature(trimToNull(request.getTemperature()));

		note.setSpo2(trimToNull(request.getSpo2()));

		note.setWeight(trimToNull(request.getWeight()));

		note.setHeight(trimToNull(request.getHeight()));

		note.setSugarLevel(trimToNull(request.getSugarLevel()));

		note.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		return toDailyNoteResponse(dailyNoteRepository.save(note));
	}

	@Transactional(readOnly = true)
	public List<SaasIpdDailyNoteResponse> getDailyNotes(Long tenantId, Long admissionId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		getAdmissionEntity(tenantId, admissionId);

		return dailyNoteRepository.findByTenantIdAndAdmissionIdOrderByNoteDateTimeDesc(tenantId, admissionId).stream()
				.map(this::toDailyNoteResponse).toList();
	}

	/*
	 * ================================================================ IPD CHARGES
	 * ================================================================
	 */

	@Transactional
	public SaasIpdChargeResponse addCharge(SaasIpdChargeRequest request) {

		if (request == null) {

			throw new RuntimeException("IPD charge request is required.");
		}

		requirePermission(request.getTenantId(), SaasPermissionAction.UPDATE);

		if (request.getAdmissionId() == null) {

			throw new RuntimeException("admissionId is required.");
		}

		if (request.getChargeType() == null || request.getChargeType().isBlank()) {

			throw new RuntimeException("chargeType is required.");
		}

		if (request.getDescription() == null || request.getDescription().isBlank()) {

			throw new RuntimeException("description is required.");
		}

		/*
		 * Prevent financial mutation after discharge.
		 */

		SaasIpdAdmission admission = getActiveAdmission(request.getTenantId(), request.getAdmissionId());

		SaasIpdChargeType chargeType;

		try {

			chargeType = SaasIpdChargeType.valueOf(request.getChargeType().trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid IPD charge type.");
		}

		BigDecimal amount = request.getAmount() == null ? BigDecimal.ZERO : request.getAmount();

		if (amount.signum() < 0) {

			throw new RuntimeException("Charge amount cannot be negative.");
		}

		SaasIpdCharge charge = new SaasIpdCharge();

		charge.setTenantId(request.getTenantId());

		charge.setAdmissionId(admission.getId());

		charge.setChargeType(chargeType);

		charge.setDescription(request.getDescription().trim());

		charge.setAmount(amount);

		charge.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasIpdCharge saved = chargeRepository.save(charge);

		BigDecimal existingTotal = admission.getTotalCharges() == null ? BigDecimal.ZERO : admission.getTotalCharges();

		admission.setTotalCharges(existingTotal.add(amount));

		admission.touch();

		admissionRepository.save(admission);

		return toChargeResponse(saved);
	}

	@Transactional(readOnly = true)
	public List<SaasIpdChargeResponse> getCharges(Long tenantId, Long admissionId) {

		requirePermission(tenantId, SaasPermissionAction.VIEW);

		getAdmissionEntity(tenantId, admissionId);

		return chargeRepository.findByTenantIdAndAdmissionIdOrderByChargeDateTimeDesc(tenantId, admissionId).stream()
				.map(this::toChargeResponse).toList();
	}

	/*
	 * ================================================================ ACCESS /
	 * VALIDATION ================================================================
	 */

	private void requirePermission(Long tenantId, SaasPermissionAction action) {

		if (tenantId == null) {

			throw new RuntimeException("tenantId is required.");
		}

		tenantAccessService.validateTenantAccess(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.IPD, action);
	}

	private SaasIpdAdmission getAdmissionEntity(Long tenantId, Long admissionId) {

		return admissionRepository.findByIdAndTenantIdAndActiveTrue(admissionId, tenantId)
				.orElseThrow(() -> new RuntimeException("Admission not found."));
	}

	private SaasIpdAdmission getActiveAdmission(Long tenantId, Long admissionId) {

		SaasIpdAdmission admission = getAdmissionEntity(tenantId, admissionId);

		if (admission.getStatus() != SaasIpdStatus.ADMITTED) {

			throw new RuntimeException("Operation is allowed only for an admitted patient.");
		}

		return admission;
	}

	private SaasWard getWard(Long tenantId, Long wardId) {

		return wardRepository.findByIdAndTenantIdAndActiveTrue(wardId, tenantId)
				.orElseThrow(() -> new RuntimeException("Ward not found."));
	}

	private SaasStaff getActiveDoctorStaff(Long doctorStaffId, Long tenantId) {

		SaasStaff doctor = staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Selected doctor staff record not found."));

		if (doctor.getStaffRole() != SaasStaffRole.DOCTOR) {

			throw new RuntimeException("Selected staff member is not a doctor.");
		}

		return doctor;
	}

	private void validateDoctorOwnership(SaasStaff doctor) {

		String role = normalizeRole(CurrentUserUtil.getRole());

		if ("DOCTOR".equals(role)) {

			Long currentAuthUserId = CurrentUserUtil.getUserId();

			if (currentAuthUserId == null || !currentAuthUserId.equals(doctor.getAuthUserId())) {

				throw new AccessDeniedException("Doctor can manage only their own IPD patients.");
			}
		}

		if ("PATIENT".equals(role)) {

			throw new AccessDeniedException("Patient cannot manage IPD clinical records.");
		}
	}

	private void validateAdmissionRequest(SaasIpdAdmissionRequest request) {

		if (request == null) {

			throw new RuntimeException("Admission request is required.");
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

		if (request.getWardId() == null) {

			throw new RuntimeException("wardId is required.");
		}

		if (request.getBedId() == null) {

			throw new RuntimeException("bedId is required.");
		}
	}

	private void validateBedForWard(SaasBed bed, SaasWard ward) {

		if (bed.getWardId() == null || !bed.getWardId().equals(ward.getId())) {

			throw new RuntimeException("Selected bed does not belong to selected ward.");
		}
	}

	private void ensureBedAvailable(SaasBed bed) {

		if (bed.getStatus() != SaasBedStatus.AVAILABLE) {

			if (bed.getStatus() == SaasBedStatus.MAINTENANCE) {

				throw new RuntimeException("Selected bed is under maintenance.");
			}

			throw new RuntimeException("Selected bed is not available.");
		}
	}

	private String normalizeRole(String role) {

		if (role == null) {

			return "";
		}

		return role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");
	}

	/*
	 * ================================================================ RESPONSE
	 * MAPPING ================================================================
	 */

	private String generateIpdNumber(SaasIpdAdmission admission) {

		return "IPD-" + admission.getTenantId() + "-" + String.format("%05d", admission.getId());
	}

	private SaasWardResponse toWardResponse(SaasWard ward) {

		return new SaasWardResponse(

				ward.getId(),

				ward.getTenantId(),

				ward.getWardName(),

				ward.getWardType(),

				ward.getDescription(),

				ward.getActive());
	}

	private SaasBedResponse toBedResponse(SaasBed bed) {

		SaasWard ward = wardRepository.findByIdAndTenantIdAndActiveTrue(bed.getWardId(), bed.getTenantId())
				.orElse(null);

		return new SaasBedResponse(

				bed.getId(),

				bed.getTenantId(),

				bed.getWardId(),

				ward == null ? null : ward.getWardName(),

				bed.getBedNumber(),

				bed.getDailyCharge(),

				bed.getStatus().name(),

				bed.getActive());
	}

	private SaasIpdAdmissionResponse toAdmissionResponse(SaasIpdAdmission admission) {

		SaasPatient patient = patientRepository
				.findByIdAndTenantIdAndActiveTrue(admission.getPatientId(), admission.getTenantId()).orElse(null);

		SaasStaff doctor = findDoctorStaff(admission.getDoctorProfileId(), admission.getTenantId());

		SaasWard ward = wardRepository.findByIdAndTenantIdAndActiveTrue(admission.getWardId(), admission.getTenantId())
				.orElse(null);

		SaasBed bed = bedRepository.findByIdAndTenantIdAndActiveTrue(admission.getBedId(), admission.getTenantId())
				.orElse(null);

		return new SaasIpdAdmissionResponse(

				admission.getId(),

				admission.getTenantId(),

				admission.getIpdNumber(),

				admission.getPatientId(),

				patient == null ? null : patient.getPatientName(),

				patient == null ? null : patient.getMobile(),

				admission.getDoctorProfileId(),

				doctor == null ? null : doctor.getStaffName(),

				doctor == null ? null : doctor.getDepartment(),

				admission.getWardId(),

				ward == null ? null : ward.getWardName(),

				admission.getBedId(),

				bed == null ? null : bed.getBedNumber(),

				admission.getAdmissionDateTime(),

				admission.getDischargeDateTime(),

				admission.getReasonForAdmission(),

				admission.getProvisionalDiagnosis(),

				admission.getDischargeSummary(),

				admission.getDischargeAdvice(),

				admission.getAdvanceAmount(),

				admission.getTotalCharges(),

				admission.getStatus().name(),

				admission.getActive(),

				admission.getCreatedAt());
	}

	private SaasIpdDailyNoteResponse toDailyNoteResponse(SaasIpdDailyNote note) {

		SaasStaff doctor = findDoctorStaff(note.getDoctorProfileId(), note.getTenantId());

		return new SaasIpdDailyNoteResponse(

				note.getId(),

				note.getTenantId(),

				note.getAdmissionId(),

				note.getDoctorProfileId(),

				doctor == null ? null : doctor.getStaffName(),

				note.getNoteDateTime(),

				note.getProgressNote(),

				note.getTreatmentPlan(),

				note.getVitals(),

				note.getBloodPressure(),

				note.getPulse(),

				note.getTemperature(),

				note.getSpo2(),

				note.getWeight(),

				note.getHeight(),

				note.getSugarLevel());
	}

	private SaasStaff findDoctorStaff(Long doctorStaffId, Long tenantId) {

		if (doctorStaffId == null || tenantId == null) {

			return null;
		}

		return staffRepository.findByIdAndTenantIdAndActiveTrue(doctorStaffId, tenantId)
				.filter(staff -> staff.getStaffRole() == SaasStaffRole.DOCTOR).orElse(null);
	}

	private SaasIpdChargeResponse toChargeResponse(SaasIpdCharge charge) {

		return new SaasIpdChargeResponse(

				charge.getId(),

				charge.getTenantId(),

				charge.getAdmissionId(),

				charge.getChargeType().name(),

				charge.getDescription(),

				charge.getAmount(),

				charge.getChargeDateTime());
	}

	private String trimToNull(String value) {

		if (value == null) {

			return null;
		}

		String trimmed = value.trim();

		return trimmed.isEmpty() ? null : trimmed;
	}
}