package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatientRequest;
import com.example.medi.saas.dto.SaasPatientResponse;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SaasPatientService {

    private final SaasPatientRepository patientRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;

    public SaasPatientService(
            SaasPatientRepository patientRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {
        this.patientRepository = patientRepository;
        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
    }

    public SaasPatientResponse createPatient(SaasPatientRequest request) {

        validateRequest(request);
        
        permissionService.requirePermission(
                request.getTenantId(),
                TenantModule.PATIENTS,
                SaasPermissionAction.CREATE
        );

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasPatient patient = new SaasPatient();

        patient.setTenantId(request.getTenantId());
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
        patient.setActive(true);
        patient.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

        SaasPatient saved = patientRepository.save(patient);

        saved.setPatientCode(generatePatientCode(saved));
        saved = patientRepository.save(saved);

        return toResponse(saved);
    }

    public List<SaasPatientResponse> getPatients(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PATIENTS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return patientRepository
                .findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasPatientResponse getPatient(Long tenantId, Long patientId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PATIENTS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        return toResponse(patient);
    }

    public List<SaasPatientResponse> searchPatients(Long tenantId, String keyword) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PATIENTS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        if (keyword == null || keyword.isBlank()) {
            return getPatients(tenantId);
        }

        String cleanKeyword = keyword.trim();

        List<SaasPatient> result = new ArrayList<>();

        result.addAll(
                patientRepository
                        .findByTenantIdAndActiveTrueAndPatientNameContainingIgnoreCaseOrderByCreatedAtDesc(
                                tenantId,
                                cleanKeyword
                        )
        );

        result.addAll(
                patientRepository
                        .findByTenantIdAndActiveTrueAndMobileContainingOrderByCreatedAtDesc(
                                tenantId,
                                cleanKeyword
                        )
        );

        return result.stream()
                .distinct()
                .map(this::toResponse)
                .toList();
    }

    public SaasPatientResponse updatePatient(Long tenantId, Long patientId, SaasPatientRequest request) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PATIENTS,
    	        SaasPermissionAction.UPDATE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
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
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PATIENTS,
    	        SaasPermissionAction.DELETE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        patient.setActive(false);
        patient.touch();

        patientRepository.save(patient);

        return new ApiResponse(true, "Patient deleted successfully");
    }

    private void validateRequest(SaasPatientRequest request) {

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
                patient.getCreatedAt()
        );
    }
}