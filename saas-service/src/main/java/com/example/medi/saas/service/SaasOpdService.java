package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasOpdVisitRequest;
import com.example.medi.saas.dto.SaasOpdVisitResponse;
import com.example.medi.saas.entity.SaasDoctorProfile;
import com.example.medi.saas.entity.SaasOpdVisit;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasOpdStatus;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasDoctorProfileRepository;
import com.example.medi.saas.repository.SaasOpdVisitRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SaasOpdService {

    private final SaasOpdVisitRepository opdRepository;
    private final SaasPatientRepository patientRepository;
    private final SaasDoctorProfileRepository doctorRepository;
    private final SaasAppointmentRepository appointmentRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;
    

    public SaasOpdService(
            SaasOpdVisitRepository opdRepository,
            SaasPatientRepository patientRepository,
            SaasDoctorProfileRepository doctorRepository,
            SaasAppointmentRepository appointmentRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
            
    ) {
        this.opdRepository = opdRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
    }

    public SaasOpdVisitResponse createOpdVisit(SaasOpdVisitRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.OPD,
    	        SaasPermissionAction.CREATE
    	);

        validateRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(request.getDoctorProfileId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        if (request.getAppointmentId() != null) {
            appointmentRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getAppointmentId(), request.getTenantId())
                    .ifPresent(appointment -> {
                        appointment.setStatus(SaasAppointmentStatus.COMPLETED);
                        appointment.touch();
                        appointmentRepository.save(appointment);
                    });
        }

        SaasOpdVisit opd = new SaasOpdVisit();
        opd.setTenantId(request.getTenantId());
        opd.setPatientId(patient.getId());
        opd.setDoctorProfileId(doctor.getId());
        opd.setAppointmentId(request.getAppointmentId());
        opd.setSymptoms(request.getSymptoms());
        opd.setDiagnosis(request.getDiagnosis());
        opd.setNotes(request.getNotes());
        opd.setConsultationFee(request.getConsultationFee() == null ? BigDecimal.ZERO : request.getConsultationFee());
        opd.setStatus(SaasOpdStatus.OPEN);
        opd.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        opd.setActive(true);

        SaasOpdVisit saved = opdRepository.save(opd);

        saved.setOpdNumber(generateOpdNumber(saved));
        saved = opdRepository.save(saved);

        return toResponse(saved);
    }

    public List<SaasOpdVisitResponse> getOpdVisits(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.OPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return opdRepository
                .findByTenantIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasOpdVisitResponse> getPatientOpdHistory(Long tenantId, Long patientId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.OPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return opdRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId, patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasOpdVisitResponse> getDoctorOpdVisits(Long tenantId, Long doctorProfileId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.OPD,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return opdRepository
                .findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByVisitDateTimeDesc(tenantId, doctorProfileId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasOpdVisitResponse completeOpd(Long tenantId, Long opdId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.OPD,
    	        SaasPermissionAction.UPDATE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasOpdVisit opd = opdRepository
                .findByIdAndTenantIdAndActiveTrue(opdId, tenantId)
                .orElseThrow(() -> new RuntimeException("OPD visit not found"));

        opd.setStatus(SaasOpdStatus.COMPLETED);
        opd.touch();

        return toResponse(opdRepository.save(opd));
    }

    public ApiResponse cancelOpd(Long tenantId, Long opdId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.OPD,
    	        SaasPermissionAction.DELETE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasOpdVisit opd = opdRepository
                .findByIdAndTenantIdAndActiveTrue(opdId, tenantId)
                .orElseThrow(() -> new RuntimeException("OPD visit not found"));

        opd.setStatus(SaasOpdStatus.CANCELLED);
        opd.setActive(false);
        opd.touch();

        opdRepository.save(opd);

        return new ApiResponse(true, "OPD visit cancelled successfully");
    }

    private void validateRequest(SaasOpdVisitRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getPatientId() == null) {
            throw new RuntimeException("patientId is required");
        }

        if (request.getDoctorProfileId() == null) {
            throw new RuntimeException("doctorProfileId is required");
        }
    }

    private String generateOpdNumber(SaasOpdVisit opd) {
        return "OPD-" + opd.getTenantId() + "-" + String.format("%05d", opd.getId());
    }

    private SaasOpdVisitResponse toResponse(SaasOpdVisit opd) {

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(opd.getPatientId(), opd.getTenantId())
                .orElse(null);

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(opd.getDoctorProfileId(), opd.getTenantId())
                .orElse(null);

        return new SaasOpdVisitResponse(
                opd.getId(),
                opd.getTenantId(),
                opd.getOpdNumber(),
                opd.getPatientId(),
                patient == null ? null : patient.getPatientName(),
                patient == null ? null : patient.getMobile(),
                opd.getDoctorProfileId(),
                doctor == null ? null : doctor.getDoctorName(),
                doctor == null ? null : doctor.getDepartment(),
                opd.getAppointmentId(),
                opd.getVisitDateTime(),
                opd.getSymptoms(),
                opd.getDiagnosis(),
                opd.getNotes(),
                opd.getConsultationFee(),
                opd.getStatus().name(),
                opd.getActive(),
                opd.getCreatedAt()
        );
    }
}