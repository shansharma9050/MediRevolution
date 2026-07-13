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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SaasIpdService {

    private final SaasWardRepository wardRepository;
    private final SaasBedRepository bedRepository;
    private final SaasIpdAdmissionRepository admissionRepository;
    private final SaasIpdDailyNoteRepository dailyNoteRepository;
    private final SaasIpdChargeRepository chargeRepository;
    private final SaasPatientRepository patientRepository;
    private final SaasDoctorProfileRepository doctorRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasNotificationService notificationService;
    private final SaasPermissionService permissionService;
    private final SaasStaffRepository staffRepository;

    public SaasIpdService(
            SaasWardRepository wardRepository,
            SaasBedRepository bedRepository,
            SaasIpdAdmissionRepository admissionRepository,
            SaasIpdDailyNoteRepository dailyNoteRepository,
            SaasIpdChargeRepository chargeRepository,
            SaasPatientRepository patientRepository,
            SaasDoctorProfileRepository doctorRepository,
            TenantAccessService tenantAccessService,
            SaasNotificationService notificationService,
            SaasPermissionService permissionService,
            SaasStaffRepository staffRepository
    ) {
        this.wardRepository = wardRepository;
        this.bedRepository = bedRepository;
        this.admissionRepository = admissionRepository;
        this.dailyNoteRepository = dailyNoteRepository;
        this.chargeRepository = chargeRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.tenantAccessService = tenantAccessService;
        this.notificationService = notificationService;
        this.permissionService = permissionService;
        this.staffRepository=staffRepository;
    }

    public SaasWardResponse createWard(SaasWardRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.IPD,
    	        SaasPermissionAction.CREATE
    	);

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getWardName() == null || request.getWardName().isBlank()) {
            throw new RuntimeException("Ward name is required");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        String wardName = request.getWardName().trim();

        boolean duplicateWard = wardRepository
                .findByTenantIdAndActiveTrueOrderByWardNameAsc(request.getTenantId())
                .stream()
                .anyMatch(existingWard ->
                        existingWard.getWardName() != null
                                && existingWard.getWardName().trim().equalsIgnoreCase(wardName)
                );

        if (duplicateWard) {
            throw new RuntimeException("Ward already exists in this workspace");
        }

        SaasWard ward = new SaasWard();
        ward.setTenantId(request.getTenantId());
        ward.setWardName(wardName);
        ward.setWardType(request.getWardType());
        ward.setDescription(request.getDescription());
        ward.setActive(true);

        return toWardResponse(wardRepository.save(ward));
    }

    public List<SaasWardResponse> getWards(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return wardRepository
                .findByTenantIdAndActiveTrueOrderByWardNameAsc(tenantId)
                .stream()
                .map(this::toWardResponse)
                .toList();
    }

    public SaasBedResponse createBed(SaasBedRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.IPD,
    	        SaasPermissionAction.CREATE
    	);

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getWardId() == null) {
            throw new RuntimeException("wardId is required");
        }

        if (request.getBedNumber() == null || request.getBedNumber().isBlank()) {
            throw new RuntimeException("Bed number is required");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasWard ward = wardRepository
                .findByIdAndTenantIdAndActiveTrue(request.getWardId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Ward not found"));

        String bedNumber = request.getBedNumber().trim();

        boolean duplicateBed = bedRepository
                .findByTenantIdAndActiveTrueOrderByBedNumberAsc(request.getTenantId())
                .stream()
                .anyMatch(existingBed ->
                        existingBed.getWardId() != null
                                && existingBed.getWardId().equals(ward.getId())
                                && existingBed.getBedNumber() != null
                                && existingBed.getBedNumber().trim().equalsIgnoreCase(bedNumber)
                );

        if (duplicateBed) {
            throw new RuntimeException("Bed number already exists in this ward");
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

    public List<SaasBedResponse> getBeds(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return bedRepository
                .findByTenantIdAndActiveTrueOrderByBedNumberAsc(tenantId)
                .stream()
                .map(this::toBedResponse)
                .toList();
    }

    public List<SaasBedResponse> getAvailableBeds(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return bedRepository
                .findByTenantIdAndStatusAndActiveTrueOrderByBedNumberAsc(tenantId, SaasBedStatus.AVAILABLE)
                .stream()
                .map(this::toBedResponse)
                .toList();
    }

    @Transactional
    public SaasIpdAdmissionResponse admitPatient(SaasIpdAdmissionRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.IPD,
    	        SaasPermissionAction.CREATE
    	);

        validateAdmissionRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        SaasStaff doctor = staffRepository
                .findByIdAndTenantIdAndActiveTrue(
                        request.getDoctorProfileId(),
                        request.getTenantId()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Selected doctor staff record not found."
                        )
                );

        if (doctor.getStaffRole() != SaasStaffRole.DOCTOR) {
            throw new RuntimeException(
                    "Selected staff member is not a doctor."
            );
        }

        if (doctor.getAuthUserId() == null) {
            throw new RuntimeException(
                    "Selected doctor's login user is missing."
            );
        }

        SaasWard ward = wardRepository
                .findByIdAndTenantIdAndActiveTrue(request.getWardId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Ward not found"));

        SaasBed bed = bedRepository
                .findByIdAndTenantIdAndActiveTrue(request.getBedId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Bed not found"));

        if (bed.getStatus() != SaasBedStatus.AVAILABLE) {
            throw new RuntimeException("Selected bed is not available");
        }

        boolean alreadyOccupied = admissionRepository.existsByTenantIdAndBedIdAndStatusAndActiveTrue(
                request.getTenantId(),
                bed.getId(),
                SaasIpdStatus.ADMITTED
        );

        if (alreadyOccupied) {
            throw new RuntimeException("Selected bed already has admitted patient");
        }

        SaasIpdAdmission admission = new SaasIpdAdmission();
        admission.setTenantId(request.getTenantId());
        admission.setPatientId(patient.getId());
        admission.setDoctorProfileId(doctor.getId());
        admission.setWardId(ward.getId());
        admission.setBedId(bed.getId());
        admission.setReasonForAdmission(request.getReasonForAdmission());
        admission.setProvisionalDiagnosis(request.getProvisionalDiagnosis());
        admission.setAdvanceAmount(request.getAdvanceAmount() == null ? BigDecimal.ZERO : request.getAdvanceAmount());
        admission.setTotalCharges(BigDecimal.ZERO);
        admission.setStatus(SaasIpdStatus.ADMITTED);
        admission.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        admission.setActive(true);

        SaasIpdAdmission saved = admissionRepository.save(admission);

        saved.setIpdNumber(generateIpdNumber(saved));
        saved = admissionRepository.save(saved);

        bed.setStatus(SaasBedStatus.OCCUPIED);
        bed.touch();
        bedRepository.save(bed);

        return toAdmissionResponse(saved);
    }

    public List<SaasIpdAdmissionResponse> getAdmissions(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return admissionRepository
                .findByTenantIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId)
                .stream()
                .map(this::toAdmissionResponse)
                .toList();
    }

    public List<SaasIpdAdmissionResponse> getPatientIpdHistory(Long tenantId, Long patientId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return admissionRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(tenantId, patientId)
                .stream()
                .map(this::toAdmissionResponse)
                .toList();
    }

    public SaasIpdAdmissionResponse getAdmission(Long tenantId, Long admissionId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasIpdAdmission admission = admissionRepository
                .findByIdAndTenantIdAndActiveTrue(admissionId, tenantId)
                .orElseThrow(() -> new RuntimeException("Admission not found"));

        return toAdmissionResponse(admission);
    }

    @Transactional
    public SaasIpdAdmissionResponse dischargePatient(
            Long admissionId,
            SaasIpdDischargeRequest request
    ) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.IPD,
    	        SaasPermissionAction.UPDATE
    	);
    	
        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasIpdAdmission admission = admissionRepository
                .findByIdAndTenantIdAndActiveTrue(admissionId, request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Admission not found"));

        if (admission.getStatus() != SaasIpdStatus.ADMITTED) {
            throw new RuntimeException("Patient is not admitted");
        }

        admission.setDischargeDateTime(java.time.LocalDateTime.now());
        admission.setDischargeSummary(request.getDischargeSummary());
        admission.setDischargeAdvice(request.getDischargeAdvice());
        admission.setStatus(SaasIpdStatus.DISCHARGED);
        admission.touch();

        SaasIpdAdmission saved = admissionRepository.save(admission);
        
        notificationService.createSystemNotification(
                saved.getTenantId(),
                SaasNotificationType.IPD,
                SaasNotificationPriority.MEDIUM,
                "Patient discharged",
                "IPD patient discharged. IPD No: " + saved.getIpdNumber(),
                saved.getId(),
                "IPD_ADMISSION",
                "/saas/ipd"
        );

        bedRepository
                .findByIdAndTenantIdAndActiveTrue(admission.getBedId(), admission.getTenantId())
                .ifPresent(bed -> {
                    bed.setStatus(SaasBedStatus.AVAILABLE);
                    bed.touch();
                    bedRepository.save(bed);
                });

        return toAdmissionResponse(saved);
    }

    public SaasIpdDailyNoteResponse addDailyNote(SaasIpdDailyNoteRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.IPD,
    	        SaasPermissionAction.UPDATE
    	);

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getAdmissionId() == null) {
            throw new RuntimeException("admissionId is required");
        }

        if (request.getDoctorProfileId() == null) {
            throw new RuntimeException("doctorProfileId is required");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        admissionRepository
                .findByIdAndTenantIdAndActiveTrue(request.getAdmissionId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Admission not found"));

        doctorRepository
                .findByIdAndTenantIdAndActiveTrue(request.getDoctorProfileId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        SaasIpdDailyNote note = new SaasIpdDailyNote();
        note.setTenantId(request.getTenantId());
        note.setAdmissionId(request.getAdmissionId());
        note.setDoctorProfileId(request.getDoctorProfileId());
        note.setProgressNote(request.getProgressNote());
        note.setTreatmentPlan(request.getTreatmentPlan());
        note.setVitals(request.getVitals());
        note.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

        return toDailyNoteResponse(dailyNoteRepository.save(note));
    }

    public List<SaasIpdDailyNoteResponse> getDailyNotes(Long tenantId, Long admissionId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return dailyNoteRepository
                .findByTenantIdAndAdmissionIdOrderByNoteDateTimeDesc(tenantId, admissionId)
                .stream()
                .map(this::toDailyNoteResponse)
                .toList();
    }

    @Transactional
    public SaasIpdChargeResponse addCharge(SaasIpdChargeRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.IPD,
    	        SaasPermissionAction.UPDATE
    	);

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getAdmissionId() == null) {
            throw new RuntimeException("admissionId is required");
        }

        if (request.getChargeType() == null || request.getChargeType().isBlank()) {
            throw new RuntimeException("chargeType is required");
        }

        if (request.getDescription() == null || request.getDescription().isBlank()) {
            throw new RuntimeException("description is required");
        }

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasIpdAdmission admission = admissionRepository
                .findByIdAndTenantIdAndActiveTrue(request.getAdmissionId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Admission not found"));

        SaasIpdChargeType chargeType = SaasIpdChargeType.valueOf(request.getChargeType().toUpperCase());

        BigDecimal amount = request.getAmount() == null ? BigDecimal.ZERO : request.getAmount();

        SaasIpdCharge charge = new SaasIpdCharge();
        charge.setTenantId(request.getTenantId());
        charge.setAdmissionId(admission.getId());
        charge.setChargeType(chargeType);
        charge.setDescription(request.getDescription());
        charge.setAmount(amount);
        charge.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

        SaasIpdCharge savedCharge = chargeRepository.save(charge);

        admission.setTotalCharges(
                admission.getTotalCharges() == null
                        ? amount
                        : admission.getTotalCharges().add(amount)
        );
        admission.touch();
        admissionRepository.save(admission);

        return toChargeResponse(savedCharge);
    }

    public List<SaasIpdChargeResponse> getCharges(Long tenantId, Long admissionId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.IPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return chargeRepository
                .findByTenantIdAndAdmissionIdOrderByChargeDateTimeDesc(tenantId, admissionId)
                .stream()
                .map(this::toChargeResponse)
                .toList();
    }

    private void validateAdmissionRequest(SaasIpdAdmissionRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getPatientId() == null) {
            throw new RuntimeException("patientId is required");
        }

        if (request.getDoctorProfileId() == null) {
            throw new RuntimeException("doctorProfileId is required");
        }

        if (request.getWardId() == null) {
            throw new RuntimeException("wardId is required");
        }

        if (request.getBedId() == null) {
            throw new RuntimeException("bedId is required");
        }
    }

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
                ward.getActive()
        );
    }

    private SaasBedResponse toBedResponse(SaasBed bed) {

        SaasWard ward = wardRepository
                .findByIdAndTenantIdAndActiveTrue(bed.getWardId(), bed.getTenantId())
                .orElse(null);

        return new SaasBedResponse(
                bed.getId(),
                bed.getTenantId(),
                bed.getWardId(),
                ward == null ? null : ward.getWardName(),
                bed.getBedNumber(),
                bed.getDailyCharge(),
                bed.getStatus().name(),
                bed.getActive()
        );
    }

    private SaasIpdAdmissionResponse toAdmissionResponse(SaasIpdAdmission admission) {

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(admission.getPatientId(), admission.getTenantId())
                .orElse(null);

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(admission.getDoctorProfileId(), admission.getTenantId())
                .orElse(null);

        SaasWard ward = wardRepository
                .findByIdAndTenantIdAndActiveTrue(admission.getWardId(), admission.getTenantId())
                .orElse(null);

        SaasBed bed = bedRepository
                .findByIdAndTenantIdAndActiveTrue(admission.getBedId(), admission.getTenantId())
                .orElse(null);

        return new SaasIpdAdmissionResponse(
                admission.getId(),
                admission.getTenantId(),
                admission.getIpdNumber(),
                admission.getPatientId(),
                patient == null ? null : patient.getPatientName(),
                patient == null ? null : patient.getMobile(),
                admission.getDoctorProfileId(),
                doctor == null ? null : doctor.getDoctorName(),
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
                admission.getCreatedAt()
        );
    }

    private SaasIpdDailyNoteResponse toDailyNoteResponse(SaasIpdDailyNote note) {

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(note.getDoctorProfileId(), note.getTenantId())
                .orElse(null);

        return new SaasIpdDailyNoteResponse(
                note.getId(),
                note.getTenantId(),
                note.getAdmissionId(),
                note.getDoctorProfileId(),
                doctor == null ? null : doctor.getDoctorName(),
                note.getNoteDateTime(),
                note.getProgressNote(),
                note.getTreatmentPlan(),
                note.getVitals()
        );
    }

    private SaasIpdChargeResponse toChargeResponse(SaasIpdCharge charge) {
        return new SaasIpdChargeResponse(
                charge.getId(),
                charge.getTenantId(),
                charge.getAdmissionId(),
                charge.getChargeType().name(),
                charge.getDescription(),
                charge.getAmount(),
                charge.getChargeDateTime()
        );
    }
}