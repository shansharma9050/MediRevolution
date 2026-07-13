package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasDoctorRequest;
import com.example.medi.saas.dto.SaasDoctorResponse;
import com.example.medi.saas.entity.SaasDoctorProfile;
import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStaffRole;
import com.example.medi.saas.enums.SaasStaffStatus;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasDoctorProfileRepository;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SaasDoctorService {

    private final SaasDoctorProfileRepository doctorRepository;
    private final SaasStaffRepository staffRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;

    public SaasDoctorService(
            SaasDoctorProfileRepository doctorRepository,
            SaasStaffRepository staffRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {
        this.doctorRepository = doctorRepository;
        this.staffRepository = staffRepository;
        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
    }

    public SaasDoctorResponse createDoctor(SaasDoctorRequest request) {

        validateRequest(request);
        
        permissionService.requirePermission(
                request.getTenantId(),
                TenantModule.DOCTORS,
                SaasPermissionAction.CREATE
        );

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasStaff staff;

        if (request.getStaffId() != null) {
            staff = staffRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getStaffId(), request.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Staff not found"));

            staff.setStaffRole(SaasStaffRole.DOCTOR);
            staff.setDepartment(request.getDepartment());
            staff.setDesignation("Doctor");
            staff.setAuthUserId(request.getAuthUserId());
            staff.touch();

            staff = staffRepository.save(staff);

        } else {
            staff = new SaasStaff();
            staff.setTenantId(request.getTenantId());
            staff.setAuthUserId(request.getAuthUserId());
            staff.setStaffName(request.getDoctorName().trim());
            staff.setEmail(request.getEmail());
            staff.setMobile(request.getMobile());
            staff.setStaffRole(SaasStaffRole.DOCTOR);
            staff.setStatus(SaasStaffStatus.ACTIVE);
            staff.setDepartment(request.getDepartment());
            staff.setDesignation("Doctor");
            staff.setActive(true);
            staff.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

            staff = staffRepository.save(staff);
            staff.setStaffCode("STF-" + staff.getTenantId() + "-" + String.format("%05d", staff.getId()));
            staff = staffRepository.save(staff);
        }

        doctorRepository
                .findByTenantIdAndStaffIdAndActiveTrue(request.getTenantId(), staff.getId())
                .ifPresent(existing -> {
                    throw new RuntimeException("Doctor profile already exists for this staff");
                });

        SaasDoctorProfile doctor = new SaasDoctorProfile();
        doctor.setTenantId(request.getTenantId());
        doctor.setStaffId(staff.getId());
        doctor.setAuthUserId(request.getAuthUserId());
        doctor.setDoctorName(request.getDoctorName().trim());
        doctor.setDepartment(request.getDepartment());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setQualification(request.getQualification());
        doctor.setExperienceYears(request.getExperienceYears());
        doctor.setRegistrationNumber(request.getRegistrationNumber());
        doctor.setMedicalCouncil(request.getMedicalCouncil());
        doctor.setConsultationFee(request.getConsultationFee());
        doctor.setOnlineConsultationFee(request.getOnlineConsultationFee());
        doctor.setOnlineConsultationAllowed(Boolean.TRUE.equals(request.getOnlineConsultationAllowed()));
        doctor.setOpdAllowed(request.getOpdAllowed() == null || Boolean.TRUE.equals(request.getOpdAllowed()));
        doctor.setIpdAllowed(Boolean.TRUE.equals(request.getIpdAllowed()));
        doctor.setBio(request.getBio());
        doctor.setActive(true);

        SaasDoctorProfile saved = doctorRepository.save(doctor);

        return toResponse(saved);
    }

    public List<SaasDoctorResponse> getDoctors(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.DOCTORS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return doctorRepository
                .findByTenantIdAndActiveTrueOrderByDoctorNameAsc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasDoctorResponse> getDoctorsByDepartment(Long tenantId, String department) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.DOCTORS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        if (department == null || department.isBlank()) {
            return getDoctors(tenantId);
        }

        return doctorRepository
                .findByTenantIdAndDepartmentAndActiveTrueOrderByDoctorNameAsc(tenantId, department)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasDoctorResponse getDoctor(Long tenantId, Long doctorId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.DOCTORS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(doctorId, tenantId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        return toResponse(doctor);
    }

    public SaasDoctorResponse updateDoctor(Long tenantId, Long doctorId, SaasDoctorRequest request) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.DOCTORS,
    	        SaasPermissionAction.UPDATE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(doctorId, tenantId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        if (request.getDoctorName() == null || request.getDoctorName().isBlank()) {
            throw new RuntimeException("Doctor name is required");
        }

        doctor.setAuthUserId(request.getAuthUserId());
        doctor.setDoctorName(request.getDoctorName().trim());
        doctor.setDepartment(request.getDepartment());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setQualification(request.getQualification());
        doctor.setExperienceYears(request.getExperienceYears());
        doctor.setRegistrationNumber(request.getRegistrationNumber());
        doctor.setMedicalCouncil(request.getMedicalCouncil());
        doctor.setConsultationFee(request.getConsultationFee());
        doctor.setOnlineConsultationFee(request.getOnlineConsultationFee());
        doctor.setOnlineConsultationAllowed(Boolean.TRUE.equals(request.getOnlineConsultationAllowed()));
        doctor.setOpdAllowed(request.getOpdAllowed() == null || Boolean.TRUE.equals(request.getOpdAllowed()));
        doctor.setIpdAllowed(Boolean.TRUE.equals(request.getIpdAllowed()));
        doctor.setBio(request.getBio());
        doctor.touch();

        SaasDoctorProfile saved = doctorRepository.save(doctor);

        staffRepository.findByIdAndTenantIdAndActiveTrue(saved.getStaffId(), tenantId)
                .ifPresent(staff -> {
                    staff.setStaffName(saved.getDoctorName());
                    staff.setDepartment(saved.getDepartment());
                    staff.setAuthUserId(saved.getAuthUserId());
                    staff.touch();
                    staffRepository.save(staff);
                });

        return toResponse(saved);
    }

    public ApiResponse deleteDoctor(Long tenantId, Long doctorId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.DOCTORS,
    	        SaasPermissionAction.DELETE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(doctorId, tenantId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        doctor.setActive(false);
        doctor.touch();

        doctorRepository.save(doctor);

        return new ApiResponse(true, "Doctor profile deleted successfully");
    }

    private void validateRequest(SaasDoctorRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getDoctorName() == null || request.getDoctorName().isBlank()) {
            throw new RuntimeException("Doctor name is required");
        }
    }

    private SaasDoctorResponse toResponse(SaasDoctorProfile doctor) {

        String email = null;
        String mobile = null;

        SaasStaff staff = staffRepository
                .findByIdAndTenantIdAndActiveTrue(doctor.getStaffId(), doctor.getTenantId())
                .orElse(null);

        if (staff != null) {
            email = staff.getEmail();
            mobile = staff.getMobile();
        }

        return new SaasDoctorResponse(
                doctor.getId(),
                doctor.getTenantId(),
                doctor.getStaffId(),
                doctor.getAuthUserId(),
                doctor.getDoctorName(),
                email,
                mobile,
                doctor.getDepartment(),
                doctor.getSpecialization(),
                doctor.getQualification(),
                doctor.getExperienceYears(),
                doctor.getRegistrationNumber(),
                doctor.getMedicalCouncil(),
                doctor.getConsultationFee(),
                doctor.getOnlineConsultationFee(),
                doctor.getOnlineConsultationAllowed(),
                doctor.getOpdAllowed(),
                doctor.getIpdAllowed(),
                doctor.getBio(),
                doctor.getActive(),
                doctor.getCreatedAt()
        );
    }
}