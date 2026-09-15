package com.example.medi.saas.service;

import com.example.medi.saas.client.AuthClient;
import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.AuthUserResponse;
import com.example.medi.saas.dto.CreateSaasPatientRequest;
import com.example.medi.saas.dto.SaasPatient360Response;
import com.example.medi.saas.dto.SaasPatientRequest;
import com.example.medi.saas.dto.SaasPatientResponse;
import com.example.medi.saas.entity.SaasAppointment;
import com.example.medi.saas.entity.SaasDiagnosticOrder;
import com.example.medi.saas.entity.SaasDiagnosticOrderItem;
import com.example.medi.saas.entity.SaasInvoice;
import com.example.medi.saas.entity.SaasIpdAdmission;
import com.example.medi.saas.entity.SaasIpdDailyNote;
import com.example.medi.saas.entity.SaasOpdVisit;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasPrescription;
import com.example.medi.saas.entity.SaasPrescriptionMedicine;
import com.example.medi.saas.enums.SaasDiagnosticType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasDiagnosticOrderItemRepository;
import com.example.medi.saas.repository.SaasDiagnosticOrderRepository;
import com.example.medi.saas.repository.SaasInvoiceRepository;
import com.example.medi.saas.repository.SaasIpdAdmissionRepository;
import com.example.medi.saas.repository.SaasIpdDailyNoteRepository;
import com.example.medi.saas.repository.SaasOpdVisitRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasPrescriptionMedicineRepository;
import com.example.medi.saas.repository.SaasPrescriptionRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SaasPatientService {

	private final SaasPatientRepository patientRepository;

	private final SaasAppointmentRepository appointmentRepository;

	private final SaasPrescriptionRepository prescriptionRepository;

	private final SaasPrescriptionMedicineRepository prescriptionMedicineRepository;

	private final TenantAccessService tenantAccessService;

	private final SaasPermissionService permissionService;

	private final AuthClient authClient;

	private final String internalServiceKey;

	private final SaasOpdVisitRepository opdVisitRepository;

	private final SaasIpdAdmissionRepository ipdAdmissionRepository;

	private final SaasDiagnosticOrderRepository diagnosticOrderRepository;

	private final SaasDiagnosticOrderItemRepository diagnosticOrderItemRepository;

	private final SaasInvoiceRepository invoiceRepository;

	private final SaasIpdDailyNoteRepository ipdDailyNoteRepository;

	public SaasPatientService(SaasPatientRepository patientRepository, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService, AuthClient authClient,
			SaasAppointmentRepository appointmentRepository, SaasPrescriptionRepository prescriptionRepository,
			SaasPrescriptionMedicineRepository prescriptionMedicineRepository,
			@Value("${internal.service.key}") String internalServiceKey, SaasOpdVisitRepository opdVisitRepository,
			SaasIpdAdmissionRepository ipdAdmissionRepository, SaasDiagnosticOrderRepository diagnosticOrderRepository,
			SaasDiagnosticOrderItemRepository diagnosticOrderItemRepository, SaasInvoiceRepository invoiceRepository,
			SaasIpdDailyNoteRepository ipdDailyNoteRepository) {

		this.patientRepository = patientRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.authClient = authClient;
		this.internalServiceKey = internalServiceKey;
		this.appointmentRepository = appointmentRepository;
		this.prescriptionRepository = prescriptionRepository;
		this.prescriptionMedicineRepository = prescriptionMedicineRepository;
		this.opdVisitRepository = opdVisitRepository;
		this.ipdAdmissionRepository = ipdAdmissionRepository;
		this.diagnosticOrderRepository = diagnosticOrderRepository;
		this.diagnosticOrderItemRepository = diagnosticOrderItemRepository;
		this.invoiceRepository = invoiceRepository;
		this.ipdDailyNoteRepository = ipdDailyNoteRepository;
	}

	public SaasPatientResponse createPatient(SaasPatientRequest request, String authorization) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.CREATE);

		tenantAccessService.validateTenantAccess(tenantId);

		if (request.getEmail() == null || request.getEmail().isBlank()) {

			throw new RuntimeException("Patient email is required for login");
		}

		if (request.getPassword() == null || request.getPassword().isBlank()) {

			throw new RuntimeException("Patient password is required for login");
		}

		if (request.getPassword().length() < 6) {

			throw new RuntimeException("Patient password must be at least 6 characters");
		}

		Optional<SaasPatient> existingPatient = patientRepository.findByTenantIdAndEmailIgnoreCase(tenantId,
				request.getEmail());

		if (existingPatient.isPresent()) {

			throw new RuntimeException("A patient with this email already exists in this workspace");
		}

		CreateSaasPatientRequest authRequest = new CreateSaasPatientRequest();

		authRequest.setFullName(request.getPatientName().trim());

		authRequest.setEmail(request.getEmail().trim().toLowerCase());

		authRequest.setMobile(request.getMobile());

		authRequest.setPassword(request.getPassword());

		AuthUserResponse authUser = authClient.createSaasPatient(authorization, internalServiceKey, authRequest);

		if (authUser == null || authUser.getId() == null) {

			throw new RuntimeException("Unable to create patient login account");
		}

		if (authUser.getRole() == null || !"PATIENT".equalsIgnoreCase(authUser.getRole())) {

			throw new RuntimeException("Invalid authentication role for patient");
		}

		SaasPatient patient = new SaasPatient();

		patient.setTenantId(tenantId);

		patient.setAuthUserId(authUser.getId());

		patient.setPatientName(request.getPatientName().trim());

		patient.setMobile(request.getMobile());

		patient.setEmail(request.getEmail().trim().toLowerCase());

		patient.setGender(request.getGender());

		patient.setDateOfBirth(request.getDateOfBirth());

		patient.setAge(request.getAge());

		patient.setBloodGroup(request.getBloodGroup());

		patient.setAddress(request.getAddress());

		patient.setCity(request.getCity());

		patient.setState(request.getState());

		patient.setPincode(request.getPincode());

		patient.setEmergencyContactName(request.getEmergencyContactName());

		patient.setEmergencyContactMobile(request.getEmergencyContactMobile());

		patient.setAllergies(request.getAllergies());

		patient.setExistingDiseases(request.getExistingDiseases());

		patient.setNotes(request.getNotes());

		patient.setActive(true);

		patient.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasPatient saved = patientRepository.save(patient);

		saved.setPatientCode(generatePatientCode(saved));

		saved = patientRepository.save(saved);

		return toResponse(saved);
	}

	public List<SaasPatientResponse> getPatients(Long tenantId) {

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		return patientRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	public SaasPatientResponse getPatient(Long tenantId, Long patientId) {

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		return toResponse(patient);
	}

	@Transactional(readOnly = true)
	public SaasPatient360Response getPatient360(Long tenantId, Long patientId) {

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		/*
		 * ============================================================ APPOINTMENTS
		 * ============================================================
		 */

		long appointmentCount = appointmentRepository.countByTenantIdAndPatientIdAndActiveTrue(tenantId, patientId);

		Optional<SaasAppointment> latestAppointment = appointmentRepository
				.findFirstByTenantIdAndPatientIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId,
						patientId);

		SaasPatient360Response.AppointmentSnapshot appointmentSnapshot = null;

		if (latestAppointment.isPresent()) {

			SaasAppointment appointment = latestAppointment.get();

			appointmentSnapshot = new SaasPatient360Response.AppointmentSnapshot(

					appointment.getId(),

					appointment.getDoctorName(),

					appointment.getDepartment(),

					appointment.getSpecialization(),

					appointment.getAppointmentDate(),

					appointment.getAppointmentTime(),

					appointment.getAppointmentType() == null ? null : appointment.getAppointmentType().name(),

					appointment.getStatus() == null ? null : appointment.getStatus().name(),

					appointment.getSymptoms());
		}

		/*
		 * ============================================================ PRESCRIPTIONS
		 * ============================================================
		 */

		long prescriptionCount = prescriptionRepository.countByTenantIdAndPatientIdAndActiveTrue(tenantId, patientId);

		Optional<SaasPrescription> latestPrescription = prescriptionRepository
				.findFirstByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(tenantId, patientId);

		Optional<SaasPrescription> nextFollowUp = prescriptionRepository
				.findFirstByTenantIdAndPatientIdAndActiveTrueAndFollowUpDateGreaterThanEqualOrderByFollowUpDateAsc(
						tenantId, patientId, LocalDate.now());

		SaasPatient360Response.PrescriptionSnapshot prescriptionSnapshot = null;

		if (latestPrescription.isPresent()) {

			SaasPrescription prescription = latestPrescription.get();

			prescriptionSnapshot = new SaasPatient360Response.PrescriptionSnapshot(

					prescription.getId(),

					prescription.getAppointmentId(),

					prescription.getDiagnosis(),

					prescription.getClinicalNotes(),

					prescription.getAdvice(),

					prescription.getLabTests(),

					prescription.getFollowUpAdvice(),

					prescription.getFollowUpDate());
		}

		SaasPatient360Response.VitalSnapshot vitalSnapshot = resolveLatestVitals(tenantId, patientId,
				latestPrescription);

		String latestDiagnosis = resolveLatestDiagnosis(tenantId, patientId, latestPrescription);

		LocalDate nextFollowUpDate = nextFollowUp.map(SaasPrescription::getFollowUpDate).orElse(null);

		/*
		 * ============================================================ OPD
		 * ============================================================
		 */

		List<SaasOpdVisit> opdVisits = opdVisitRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId, patientId);

		long opdVisitCount = opdVisits.size();

		/*
		 * ============================================================ IPD
		 * ============================================================
		 */

		List<SaasIpdAdmission> ipdAdmissions = ipdAdmissionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId, patientId);

		long ipdAdmissionCount = ipdAdmissions.size();

		/*
		 * ============================================================ LAB + RADIOLOGY
		 * ============================================================
		 */

		List<SaasDiagnosticOrder> diagnosticOrders = diagnosticOrderRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId, patientId);

		long labInvestigationCount = diagnosticOrders.stream()
				.filter(order -> order.getDiagnosticType() == SaasDiagnosticType.LAB).count();

		long radiologyInvestigationCount = diagnosticOrders.stream()
				.filter(order -> order.getDiagnosticType() == SaasDiagnosticType.RADIOLOGY).count();

		/*
		 * ============================================================ BILLING
		 * ============================================================
		 */

		List<SaasInvoice> invoices = invoiceRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId, patientId);

		long invoiceCount = invoices.size();

		BigDecimal totalBilledAmount = invoices.stream().map(SaasInvoice::getTotalAmount)
				.filter(amount -> amount != null).reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal totalPaidAmount = invoices.stream().map(SaasInvoice::getPaidAmount).filter(amount -> amount != null)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal totalOutstandingAmount = invoices.stream().map(SaasInvoice::getDueAmount)
				.filter(amount -> amount != null).reduce(BigDecimal.ZERO, BigDecimal::add);

		/*
		 * ============================================================ MEDICATION
		 * HISTORY ============================================================
		 */

		List<SaasPatient360Response.MedicationHistoryItem> medicationHistory = buildMedicationHistory(tenantId,
				patientId);

		/*
		 * ============================================================ INVESTIGATION +
		 * REPORT HISTORY ============================================================
		 */

		List<SaasPatient360Response.InvestigationHistoryItem> investigationHistory = buildInvestigationHistory(tenantId,
				diagnosticOrders);

		/*
		 * ============================================================ LONGITUDINAL
		 * TIMELINE ============================================================
		 */

		List<SaasPatient360Response.TimelineItem> timeline = buildPatientTimeline(tenantId, patientId);

		LocalDateTime lastClinicalActivityAt = timeline.stream().map(SaasPatient360Response.TimelineItem::getEventAt)
				.filter(eventAt -> eventAt != null).max(LocalDateTime::compareTo).orElse(null);

		SaasPatient360Response.ClinicalOverview clinicalOverview = new SaasPatient360Response.ClinicalOverview(

				opdVisitCount,

				ipdAdmissionCount,

				labInvestigationCount,

				radiologyInvestigationCount,

				invoiceCount,

				totalBilledAmount,

				totalPaidAmount,

				totalOutstandingAmount,

				lastClinicalActivityAt);

		return new SaasPatient360Response(

				toResponse(patient),

				appointmentCount,

				appointmentSnapshot,

				prescriptionCount,

				prescriptionSnapshot,

				vitalSnapshot,

				latestDiagnosis,

				nextFollowUpDate,

				clinicalOverview,

				medicationHistory,

				investigationHistory,

				timeline);
	}

	/*
	 * ================================================================ MEDICATION
	 * HISTORY ================================================================
	 */

	private List<SaasPatient360Response.MedicationHistoryItem> buildMedicationHistory(Long tenantId, Long patientId) {

		List<SaasPrescription> prescriptions = prescriptionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(tenantId, patientId);

		if (prescriptions.isEmpty()) {

			return List.of();
		}

		List<Long> prescriptionIds = prescriptions.stream().map(SaasPrescription::getId).filter(id -> id != null)
				.toList();

		if (prescriptionIds.isEmpty()) {

			return List.of();
		}

		List<SaasPrescriptionMedicine> medicines = prescriptionMedicineRepository
				.findByTenantIdAndPrescriptionIdInOrderByPrescriptionIdDescIdAsc(tenantId, prescriptionIds);

		if (medicines.isEmpty()) {

			return List.of();
		}

		Map<Long, SaasPrescription> prescriptionMap = new HashMap<>();

		for (SaasPrescription prescription : prescriptions) {

			if (prescription.getId() != null) {

				prescriptionMap.put(prescription.getId(), prescription);
			}
		}

		List<SaasPatient360Response.MedicationHistoryItem> history = new ArrayList<>();

		for (SaasPrescriptionMedicine medicine : medicines) {

			SaasPrescription prescription = prescriptionMap.get(medicine.getPrescriptionId());

			if (prescription == null) {

				continue;
			}

			history.add(new SaasPatient360Response.MedicationHistoryItem(

					prescription.getId(),

					prescription.getAppointmentId(),

					prescription.getCreatedAt(),

					prescription.getDiagnosis(),

					medicine.getMedicineName(),

					medicine.getDosage(),

					medicine.getFrequency(),

					medicine.getDuration(),

					medicine.getInstructions()));
		}

		history.sort(

				Comparator.comparing(SaasPatient360Response.MedicationHistoryItem::getPrescribedAt,

						Comparator.nullsLast(Comparator.reverseOrder()))
						.thenComparing(SaasPatient360Response.MedicationHistoryItem::getPrescriptionId,

								Comparator.nullsLast(Comparator.reverseOrder())));

		return history;
	}

	/*
	 * ================================================================
	 * INVESTIGATION / REPORT HISTORY
	 * ================================================================
	 */

	private List<SaasPatient360Response.InvestigationHistoryItem> buildInvestigationHistory(Long tenantId,
			List<SaasDiagnosticOrder> diagnosticOrders) {

		if (diagnosticOrders == null || diagnosticOrders.isEmpty()) {

			return List.of();
		}

		List<Long> orderIds = diagnosticOrders.stream().map(SaasDiagnosticOrder::getId).filter(id -> id != null)
				.toList();

		if (orderIds.isEmpty()) {

			return List.of();
		}

		List<SaasDiagnosticOrderItem> orderItems = diagnosticOrderItemRepository
				.findByTenantIdAndOrderIdInOrderByOrderIdDescIdAsc(tenantId, orderIds);

		Map<Long, List<SaasDiagnosticOrderItem>> itemsByOrder = new HashMap<>();

		for (SaasDiagnosticOrderItem item : orderItems) {

			itemsByOrder.computeIfAbsent(item.getOrderId(), key -> new ArrayList<>()).add(item);
		}

		List<SaasPatient360Response.InvestigationHistoryItem> history = new ArrayList<>();

		for (SaasDiagnosticOrder order : diagnosticOrders) {

			List<SaasPatient360Response.InvestigationTestItem> tests = itemsByOrder
					.getOrDefault(order.getId(), List.of()).stream()
					.map(item -> new SaasPatient360Response.InvestigationTestItem(

							item.getTestId(),

							item.getTestName(),

							item.getTestCode(),

							item.getPrice()))
					.toList();

			history.add(new SaasPatient360Response.InvestigationHistoryItem(

					order.getId(),

					order.getOrderNumber(),

					order.getDiagnosticType() == null ? null : order.getDiagnosticType().name(),

					order.getStatus() == null ? null : order.getStatus().name(),

					order.getAppointmentId(),

					order.getPrescriptionId(),

					order.getOrderDateTime(),

					order.getSampleCollectedAt(),

					order.getReportReadyAt(),

					order.getClinicalNotes(),

					order.getResultSummary(),

					order.getResultDetails(),

					order.getReportFileUrl(),

					tests));
		}

		history.sort(

				Comparator.comparing(

						SaasPatient360Response.InvestigationHistoryItem::getOrderedAt,

						Comparator.nullsLast(Comparator.reverseOrder())));

		return history;
	}

	/*
	 * ================================================================ LATEST
	 * VITALS ================================================================
	 */

	private SaasPatient360Response.VitalSnapshot resolveLatestVitals(Long tenantId, Long patientId,
			Optional<SaasPrescription> latestPrescription) {

		LocalDateTime latestVitalDateTime = null;

		SaasPatient360Response.VitalSnapshot latestVitals = null;

		if (latestPrescription.isPresent()) {

			SaasPrescription prescription = latestPrescription.get();

			if (hasAnyVitals(prescription.getBloodPressure(), prescription.getPulse(), prescription.getTemperature(),
					prescription.getSpo2(), prescription.getWeight(), prescription.getHeight(),
					prescription.getSugarLevel())) {

				latestVitalDateTime = prescription.getCreatedAt();

				latestVitals = new SaasPatient360Response.VitalSnapshot(

						prescription.getBloodPressure(),

						prescription.getPulse(),

						prescription.getTemperature(),

						prescription.getSpo2(),

						prescription.getWeight(),

						prescription.getHeight(),

						prescription.getSugarLevel());
			}
		}

		Optional<SaasIpdAdmission> latestAdmission = ipdAdmissionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId, patientId).stream()
				.findFirst();

		if (latestAdmission.isPresent()) {

			SaasIpdAdmission admission = latestAdmission.get();

			Optional<SaasIpdDailyNote> latestDailyNote = ipdDailyNoteRepository
					.findFirstByTenantIdAndAdmissionIdOrderByNoteDateTimeDesc(tenantId, admission.getId());

			if (latestDailyNote.isPresent()) {

				SaasIpdDailyNote note = latestDailyNote.get();

				if (hasAnyVitals(note.getBloodPressure(), note.getPulse(), note.getTemperature(), note.getSpo2(),
						note.getWeight(), note.getHeight(), note.getSugarLevel())) {

					if (latestVitalDateTime == null || (note.getNoteDateTime() != null
							&& note.getNoteDateTime().isAfter(latestVitalDateTime))) {

						latestVitals = new SaasPatient360Response.VitalSnapshot(

								note.getBloodPressure(),

								note.getPulse(),

								note.getTemperature(),

								note.getSpo2(),

								note.getWeight(),

								note.getHeight(),

								note.getSugarLevel());
					}
				}
			}
		}

		return latestVitals;
	}

	private boolean hasAnyVitals(String bloodPressure, String pulse, String temperature, String spo2, String weight,
			String height, String sugarLevel) {

		return hasText(bloodPressure) || hasText(pulse) || hasText(temperature) || hasText(spo2) || hasText(weight)
				|| hasText(height) || hasText(sugarLevel);
	}

	/*
	 * ================================================================ LATEST
	 * DIAGNOSIS ================================================================
	 */

	private String resolveLatestDiagnosis(Long tenantId, Long patientId,
			Optional<SaasPrescription> latestPrescription) {

		LocalDateTime latestDateTime = null;

		String latestDiagnosis = null;

		if (latestPrescription.isPresent()) {

			SaasPrescription prescription = latestPrescription.get();

			if (hasText(prescription.getDiagnosis())) {

				latestDateTime = prescription.getCreatedAt();

				latestDiagnosis = prescription.getDiagnosis();
			}
		}

		Optional<SaasOpdVisit> latestOpd = opdVisitRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId, patientId).stream()
				.filter(opd -> hasText(opd.getDiagnosis())).findFirst();

		if (latestOpd.isPresent()) {

			SaasOpdVisit opd = latestOpd.get();

			if (latestDateTime == null
					|| (opd.getVisitDateTime() != null && opd.getVisitDateTime().isAfter(latestDateTime))) {

				latestDateTime = opd.getVisitDateTime();

				latestDiagnosis = opd.getDiagnosis();
			}
		}

		Optional<SaasIpdAdmission> latestIpd = ipdAdmissionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId, patientId).stream()
				.filter(ipd -> hasText(ipd.getProvisionalDiagnosis())).findFirst();

		if (latestIpd.isPresent()) {

			SaasIpdAdmission ipd = latestIpd.get();

			if (latestDateTime == null
					|| (ipd.getAdmissionDateTime() != null && ipd.getAdmissionDateTime().isAfter(latestDateTime))) {

				latestDiagnosis = ipd.getProvisionalDiagnosis();
			}
		}

		return latestDiagnosis;
	}

	private boolean hasText(String value) {

		return value != null && !value.trim().isEmpty();
	}

	/*
	 * ================================================================ PATIENT
	 * TIMELINE ================================================================
	 */

	private List<SaasPatient360Response.TimelineItem> buildPatientTimeline(Long tenantId, Long patientId) {

		List<SaasPatient360Response.TimelineItem> timeline = new ArrayList<>();

		List<SaasAppointment> appointments = appointmentRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(tenantId,
						patientId);

		for (SaasAppointment appointment : appointments) {

			LocalDateTime eventAt = null;

			if (appointment.getAppointmentDate() != null && appointment.getAppointmentTime() != null) {

				eventAt = appointment.getAppointmentDate().atTime(appointment.getAppointmentTime());
			}

			String subtitle = buildAppointmentSubtitle(appointment);

			String detail = firstNonBlank(appointment.getSymptoms(), appointment.getNotes());

			timeline.add(new SaasPatient360Response.TimelineItem(

					"APPOINTMENT",

					appointment.getId(),

					eventAt,

					"Appointment",

					subtitle,

					appointment.getStatus() == null ? null : appointment.getStatus().name(),

					detail,

					appointment.getId()));
		}

		List<SaasPrescription> prescriptions = prescriptionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(tenantId, patientId);

		for (SaasPrescription prescription : prescriptions) {

			String detail = firstNonBlank(prescription.getDiagnosis(), prescription.getClinicalNotes(),
					prescription.getAdvice());

			String subtitle = prescription.getDiagnosis();

			if (subtitle == null || subtitle.isBlank()) {

				subtitle = "Clinical prescription";
			}

			timeline.add(new SaasPatient360Response.TimelineItem(

					"PRESCRIPTION",

					prescription.getId(),

					prescription.getCreatedAt(),

					"Prescription",

					subtitle,

					"ACTIVE",

					detail,

					prescription.getAppointmentId()));
		}

		List<SaasOpdVisit> opdVisits = opdVisitRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId, patientId);

		for (SaasOpdVisit opd : opdVisits) {

			String subtitle = firstNonBlank(opd.getOpdNumber(), opd.getDiagnosis(), "Outpatient visit");

			String detail = firstNonBlank(opd.getDiagnosis(), opd.getSymptoms(), opd.getNotes());

			timeline.add(new SaasPatient360Response.TimelineItem(

					"OPD",

					opd.getId(),

					opd.getVisitDateTime(),

					"OPD Visit",

					subtitle,

					opd.getStatus() == null ? null : opd.getStatus().name(),

					detail,

					opd.getAppointmentId()));
		}

		List<SaasIpdAdmission> ipdAdmissions = ipdAdmissionRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId, patientId);

		for (SaasIpdAdmission ipd : ipdAdmissions) {

			String subtitle = firstNonBlank(ipd.getIpdNumber(), ipd.getProvisionalDiagnosis(), "Inpatient admission");

			String detail = firstNonBlank(ipd.getProvisionalDiagnosis(), ipd.getReasonForAdmission(),
					ipd.getDischargeSummary(), ipd.getDischargeAdvice());

			timeline.add(new SaasPatient360Response.TimelineItem(

					"IPD",

					ipd.getId(),

					ipd.getAdmissionDateTime(),

					"IPD Admission",

					subtitle,

					ipd.getStatus() == null ? null : ipd.getStatus().name(),

					detail,

					null));
		}

		List<SaasDiagnosticOrder> diagnosticOrders = diagnosticOrderRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByOrderDateTimeDesc(tenantId, patientId);

		for (SaasDiagnosticOrder order : diagnosticOrders) {

			String diagnosticType = order.getDiagnosticType() == null ? "DIAGNOSTIC" : order.getDiagnosticType().name();

			String title;

			if ("LAB".equalsIgnoreCase(diagnosticType)) {

				title = "Lab Investigation";

			} else if ("RADIOLOGY".equalsIgnoreCase(diagnosticType)) {

				title = "Radiology Investigation";

			} else {

				title = "Diagnostic Investigation";
			}

			String subtitle = firstNonBlank(order.getOrderNumber(), diagnosticType);

			String detail = firstNonBlank(order.getResultSummary(), order.getResultDetails(), order.getClinicalNotes());

			timeline.add(new SaasPatient360Response.TimelineItem(

					diagnosticType,

					order.getId(),

					order.getOrderDateTime(),

					title,

					subtitle,

					order.getStatus() == null ? null : order.getStatus().name(),

					detail,

					order.getAppointmentId()));
		}

		List<SaasInvoice> invoices = invoiceRepository
				.findByTenantIdAndPatientIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId, patientId);

		for (SaasInvoice invoice : invoices) {

			String subtitle = firstNonBlank(

					invoice.getInvoiceNumber(),

					invoice.getInvoiceType() == null ? null : invoice.getInvoiceType().name(),

					"Patient invoice");

			StringBuilder billingDetail = new StringBuilder();

			if (invoice.getTotalAmount() != null) {

				billingDetail.append("Total ₹").append(invoice.getTotalAmount());
			}

			if (invoice.getPaidAmount() != null) {

				if (!billingDetail.isEmpty()) {

					billingDetail.append(" • ");
				}

				billingDetail.append("Paid ₹").append(invoice.getPaidAmount());
			}

			if (invoice.getDueAmount() != null) {

				if (!billingDetail.isEmpty()) {

					billingDetail.append(" • ");
				}

				billingDetail.append("Due ₹").append(invoice.getDueAmount());
			}

			String detail = billingDetail.isEmpty() ? invoice.getNotes() : billingDetail.toString();

			timeline.add(new SaasPatient360Response.TimelineItem(

					"BILLING",

					invoice.getId(),

					invoice.getInvoiceDateTime(),

					"Invoice",

					subtitle,

					invoice.getPaymentStatus() == null ? null : invoice.getPaymentStatus().name(),

					detail,

					null));
		}

		timeline.sort(

				Comparator.comparing(

						SaasPatient360Response.TimelineItem::getEventAt,

						Comparator.nullsLast(Comparator.reverseOrder())));

		return timeline;
	}

	private String firstNonBlank(String... values) {

		if (values == null) {

			return null;
		}

		for (String value : values) {

			if (value != null && !value.isBlank()) {

				return value.trim();
			}
		}

		return null;
	}

	private String buildAppointmentSubtitle(SaasAppointment appointment) {

		List<String> parts = new ArrayList<>();

		if (appointment.getDoctorName() != null && !appointment.getDoctorName().isBlank()) {

			parts.add(appointment.getDoctorName().trim());
		}

		if (appointment.getSpecialization() != null && !appointment.getSpecialization().isBlank()) {

			parts.add(appointment.getSpecialization().trim());

		} else if (appointment.getDepartment() != null && !appointment.getDepartment().isBlank()) {

			parts.add(appointment.getDepartment().trim());
		}

		if (appointment.getAppointmentType() != null) {

			parts.add(appointment.getAppointmentType().name());
		}

		if (parts.isEmpty()) {

			return "Patient appointment";
		}

		return String.join(" • ", parts);
	}

	public List<SaasPatientResponse> searchPatients(Long tenantId, String keyword) {

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		if (keyword == null || keyword.isBlank()) {

			return getPatients(tenantId);
		}

		String cleanKeyword = keyword.trim();

		List<SaasPatient> result = new ArrayList<>();

		result.addAll(

				patientRepository.findByTenantIdAndActiveTrueAndPatientNameContainingIgnoreCaseOrderByCreatedAtDesc(
						tenantId, cleanKeyword));

		result.addAll(

				patientRepository.findByTenantIdAndActiveTrueAndMobileContainingOrderByCreatedAtDesc(tenantId,
						cleanKeyword));

		return result.stream().distinct().map(this::toResponse).toList();
	}

	public SaasPatientResponse updatePatient(Long tenantId, Long patientId, SaasPatientRequest request) {

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.UPDATE);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		if (request.getPatientName() == null || request.getPatientName().isBlank()) {

			throw new RuntimeException("Patient name is required");
		}

		patient.setPatientName(request.getPatientName().trim());

		patient.setMobile(request.getMobile());

		patient.setEmail(request.getEmail());

		patient.setGender(request.getGender());

		patient.setDateOfBirth(request.getDateOfBirth());

		patient.setAge(request.getAge());

		patient.setBloodGroup(request.getBloodGroup());

		patient.setAddress(request.getAddress());

		patient.setCity(request.getCity());

		patient.setState(request.getState());

		patient.setPincode(request.getPincode());

		patient.setEmergencyContactName(request.getEmergencyContactName());

		patient.setEmergencyContactMobile(request.getEmergencyContactMobile());

		patient.setAllergies(request.getAllergies());

		patient.setExistingDiseases(request.getExistingDiseases());

		patient.setNotes(request.getNotes());

		patient.touch();

		SaasPatient saved = patientRepository.save(patient);

		return toResponse(saved);
	}

	public ApiResponse deletePatient(Long tenantId, Long patientId) {

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.DELETE);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasPatient patient = patientRepository.findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		patient.setActive(false);

		patient.touch();

		patientRepository.save(patient);

		return new ApiResponse(true, "Patient deleted successfully");
	}

	private void validateRequest(SaasPatientRequest request) {

		if (request == null) {

			throw new RuntimeException("Patient request is required");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required");
		}

		if (request.getPatientName() == null || request.getPatientName().isBlank()) {

			throw new RuntimeException("Patient name is required");
		}

		if ((request.getMobile() == null || request.getMobile().isBlank())
				&& (request.getEmail() == null || request.getEmail().isBlank())) {

			throw new RuntimeException("Patient mobile or email is required");
		}
	}

	private String generatePatientCode(SaasPatient patient) {

		return "PT-" + patient.getTenantId() + "-" + String.format("%05d", patient.getId());
	}

	private SaasPatientResponse toResponse(SaasPatient patient) {

		return new SaasPatientResponse(

				patient.getId(),

				patient.getTenantId(),

				patient.getPatientCode(),

				patient.getPatientName(),

				patient.getMobile(),

				patient.getEmail(),

				patient.getGender(),

				patient.getDateOfBirth(),

				patient.getAge(),

				patient.getBloodGroup(),

				patient.getAddress(),

				patient.getCity(),

				patient.getState(),

				patient.getPincode(),

				patient.getEmergencyContactName(),

				patient.getEmergencyContactMobile(),

				patient.getAllergies(),

				patient.getExistingDiseases(),

				patient.getNotes(),

				patient.getActive(),

				patient.getCreatedAt());
	}

	@Transactional(readOnly = true)
	public SaasPatientResponse getMyPatient(Long tenantId) {

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new AccessDeniedException("Logged-in patient user ID not found.");
		}

		if (tenantId == null) {

			throw new RuntimeException("tenantId is required.");
		}

		SaasPatient patient = patientRepository.findByAuthUserIdAndTenantIdAndActiveTrue(authUserId, tenantId)
				.orElseThrow(() -> new AccessDeniedException("You are not assigned to this workspace as a patient."));

		return toResponse(patient);
	}
}