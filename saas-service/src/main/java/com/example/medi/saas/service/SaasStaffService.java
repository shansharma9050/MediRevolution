package com.example.medi.saas.service;

import com.example.medi.saas.client.AuthClient;
import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.AuthStaffCreateRequest;
import com.example.medi.saas.dto.AuthUserResponse;
import com.example.medi.saas.dto.SaasStaffRequest;
import com.example.medi.saas.dto.SaasStaffResponse;
import com.example.medi.saas.entity.SaasStaff;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasStaffRole;
import com.example.medi.saas.enums.SaasStaffStatus;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class SaasStaffService {

	private final SaasStaffRepository staffRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final TenantMemberRepository tenantMemberRepository;
	private final AuthClient authClient;
	private final HttpServletRequest httpServletRequest;

	public SaasStaffService(SaasStaffRepository staffRepository, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService, TenantMemberRepository tenantMemberRepository,
			AuthClient authClient, HttpServletRequest httpServletRequest) {
		this.staffRepository = staffRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.tenantMemberRepository = tenantMemberRepository;
		this.authClient = authClient;
		this.httpServletRequest = httpServletRequest;
	}

	@Transactional
	public SaasStaffResponse createStaff(SaasStaffRequest request) {

		validateRequest(request);

		permissionService.requirePermission(request.getTenantId(), TenantModule.STAFF, SaasPermissionAction.CREATE);

		tenantAccessService.validateTenantAccess(request.getTenantId());

		if (request.getAuthUserId() == null && (request.getPassword() == null || request.getPassword().isBlank())) {
			throw new RuntimeException("Password is required for new staff login");
		}

		Long authUserId = resolveStaffAuthUserId(request);

		SaasStaff staff = new SaasStaff();
		staff.setTenantId(request.getTenantId());
		staff.setAuthUserId(authUserId);
		staff.setStatus(SaasStaffStatus.ACTIVE);
		staff.setActive(true);
		staff.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		applyRequestToStaff(staff, request);

		SaasStaff saved = staffRepository.save(staff);

		saved.setStaffCode(generateStaffCode(saved));
		saved = staffRepository.save(saved);

		syncTenantMemberForStaff(saved, true);

		return toResponse(saved);
	}

	@Transactional(readOnly = true)
	public List<SaasStaffResponse> getStaff(Long tenantId) {

		permissionService.requirePermission(tenantId, TenantModule.STAFF, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		return staffRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream().map(this::toResponse)
				.toList();
	}

	@Transactional(readOnly = true)
	public List<SaasStaffResponse> getDoctorsAsStaff(Long tenantId) {

		/*
		 * Doctor list can be used by appointment and availability pages. STAFF VIEW
		 * permission is enough because doctors are staff records.
		 */
		permissionService.requirePermission(tenantId, TenantModule.STAFF, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		return staffRepository
				.findByTenantIdAndStaffRoleAndActiveTrueOrderByStaffNameAsc(tenantId, SaasStaffRole.DOCTOR).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasStaffResponse getStaffById(Long tenantId, Long staffId) {

		permissionService.requirePermission(tenantId, TenantModule.STAFF, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasStaff staff = staffRepository.findByIdAndTenantIdAndActiveTrue(staffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Staff not found"));

		return toResponse(staff);
	}

	@Transactional(readOnly = true)
	public List<SaasStaffResponse> searchStaff(Long tenantId, String keyword) {

		permissionService.requirePermission(tenantId, TenantModule.STAFF, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		if (keyword == null || keyword.isBlank()) {
			return getStaff(tenantId);
		}

		String cleanKeyword = keyword.trim();

		List<SaasStaff> result = new ArrayList<>();

		result.addAll(staffRepository.findByTenantIdAndActiveTrueAndStaffNameContainingIgnoreCaseOrderByCreatedAtDesc(
				tenantId, cleanKeyword));

		result.addAll(staffRepository.findByTenantIdAndActiveTrueAndMobileContainingOrderByCreatedAtDesc(tenantId,
				cleanKeyword));

		return result.stream().distinct().map(this::toResponse).toList();
	}

	@Transactional
	public SaasStaffResponse updateStaff(Long tenantId, Long staffId, SaasStaffRequest request) {

		permissionService.requirePermission(tenantId, TenantModule.STAFF, SaasPermissionAction.UPDATE);

		tenantAccessService.validateTenantAccess(tenantId);

		if (request == null) {
			throw new RuntimeException("Staff request is required");
		}

		request.setTenantId(tenantId);

		validateRequest(request);

		SaasStaff staff = staffRepository.findByIdAndTenantIdAndActiveTrue(staffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Staff not found"));

		/*
		 * Important: Do not overwrite authUserId with null during update.
		 */
		if (request.getAuthUserId() != null) {
			staff.setAuthUserId(request.getAuthUserId());
		}

		applyRequestToStaff(staff, request);
		staff.touch();

		SaasStaff saved = staffRepository.save(staff);

		/*
		 * Sync tenant member name/email/mobile/role. Do not reset custom permissions on
		 * update.
		 */
		syncTenantMemberForStaff(saved, false);

		return toResponse(saved);
	}

	@Transactional
	public ApiResponse deleteStaff(Long tenantId, Long staffId) {

		permissionService.requirePermission(tenantId, TenantModule.STAFF, SaasPermissionAction.DELETE);

		tenantAccessService.validateTenantAccess(tenantId);

		SaasStaff staff = staffRepository.findByIdAndTenantIdAndActiveTrue(staffId, tenantId)
				.orElseThrow(() -> new RuntimeException("Staff not found"));

		staff.setActive(false);
		staff.setStatus(SaasStaffStatus.LEFT);
		staff.touch();

		staffRepository.save(staff);

		deactivateTenantMemberForStaff(staff);

		return new ApiResponse(true, "Staff deleted successfully");
	}

	private void applyRequestToStaff(SaasStaff staff, SaasStaffRequest request) {

		SaasStaffRole staffRole = SaasStaffRole.valueOf(request.getStaffRole().trim().toUpperCase());

		staff.setStaffName(request.getStaffName().trim());
		staff.setEmail(clean(request.getEmail()));
		staff.setMobile(clean(request.getMobile()));
		staff.setStaffRole(staffRole);

		staff.setDepartment(clean(request.getDepartment()));
		staff.setDesignation(clean(request.getDesignation()));
		staff.setGender(clean(request.getGender()));
		staff.setDateOfBirth(request.getDateOfBirth());
		staff.setJoiningDate(request.getJoiningDate());
		staff.setAddress(clean(request.getAddress()));
		staff.setCity(clean(request.getCity()));
		staff.setState(clean(request.getState()));
		staff.setPincode(clean(request.getPincode()));
		staff.setSalary(request.getSalary());
		staff.setEmergencyContactName(clean(request.getEmergencyContactName()));
		staff.setEmergencyContactMobile(clean(request.getEmergencyContactMobile()));

		if (staffRole == SaasStaffRole.DOCTOR) {
			staff.setQualification(clean(request.getQualification()));
			staff.setSpecialization(clean(request.getSpecialization()));
			staff.setRegistrationNumber(clean(request.getRegistrationNumber()));
			staff.setExperienceYears(request.getExperienceYears());
			staff.setConsultationFee(request.getConsultationFee());
			staff.setOnlineConsultationFee(request.getOnlineConsultationFee());
			staff.setOnlineConsultationEnabled(Boolean.TRUE.equals(request.getOnlineConsultationEnabled()));
		} else {
			clearDoctorFields(staff);
		}
	}

	private void clearDoctorFields(SaasStaff staff) {
		staff.setQualification(null);
		staff.setSpecialization(null);
		staff.setRegistrationNumber(null);
		staff.setExperienceYears(null);
		staff.setConsultationFee(null);
		staff.setOnlineConsultationFee(null);
		staff.setOnlineConsultationEnabled(false);
	}

	private Long resolveStaffAuthUserId(SaasStaffRequest request) {

		if (request.getAuthUserId() != null) {
			return request.getAuthUserId();
		}

		AuthStaffCreateRequest authRequest = new AuthStaffCreateRequest();
		authRequest.setFullName(request.getStaffName());
		authRequest.setEmail(request.getEmail());
		authRequest.setMobile(request.getMobile());
		authRequest.setPassword(request.getPassword());
		authRequest.setRole("SAAS_STAFF");

		String authorization = httpServletRequest.getHeader("Authorization");

		AuthUserResponse authUser = authClient.createSaasStaff(authorization, authRequest);

		if (authUser == null || authUser.getId() == null) {
			throw new RuntimeException("Unable to create staff login user");
		}

		if (!"SAAS_STAFF".equals(authUser.getRole())) {
			throw new RuntimeException("Staff login user must have SAAS_STAFF role");
		}

		return authUser.getId();
	}

	private TenantMemberRole resolveTenantMemberRole(SaasStaffRole staffRole) {

		if (staffRole == null) {
			return TenantMemberRole.STAFF;
		}

		return switch (staffRole) {

		case OWNER -> TenantMemberRole.OWNER;

		case ADMIN -> TenantMemberRole.ADMIN;

		case DOCTOR -> TenantMemberRole.DOCTOR;

		case RECEPTIONIST -> TenantMemberRole.RECEPTIONIST;

		case PHARMACIST -> TenantMemberRole.PHARMACIST;

		case LAB_TECHNICIAN -> TenantMemberRole.LAB_TECHNICIAN;

		case ACCOUNTANT -> TenantMemberRole.ACCOUNTANT;

		case MANAGER -> TenantMemberRole.MANAGER;

		case SALES_MANAGER -> TenantMemberRole.SALES_MANAGER;

		case PURCHASE_MANAGER -> TenantMemberRole.PURCHASE_MANAGER;

		case WAREHOUSE_MANAGER -> TenantMemberRole.WAREHOUSE_MANAGER;

		case CASHIER -> TenantMemberRole.CASHIER;

		case SALESPERSON -> TenantMemberRole.SALESPERSON;

		case NURSE, RADIOLOGY_TECHNICIAN, BILLING_STAFF, WARD_BOY, CLEANING_STAFF, SECURITY, OTHER ->
			TenantMemberRole.STAFF;
		};
	}

	@Transactional(readOnly = true)
	public List<SaasStaffResponse> getDoctorsForAppointments(Long tenantId) {

		permissionService.requirePermission(tenantId, TenantModule.APPOINTMENTS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		return staffRepository
				.findByTenantIdAndStaffRoleAndActiveTrueOrderByStaffNameAsc(tenantId, SaasStaffRole.DOCTOR).stream()
				.map(this::toResponse).toList();
	}

	private void syncTenantMemberForStaff(SaasStaff staff, boolean assignDefaultPermissions) {

		if (staff.getTenantId() == null || staff.getAuthUserId() == null) {
			return;
		}

		TenantMemberRole memberRole = resolveTenantMemberRole(staff.getStaffRole());

		TenantMember member = tenantMemberRepository
				.findByTenantIdAndAuthUserIdAndActiveTrue(staff.getTenantId(), staff.getAuthUserId()).orElse(null);

		if (member == null) {
			member = new TenantMember();
			member.setTenantId(staff.getTenantId());
			member.setAuthUserId(staff.getAuthUserId());
			member.setActive(true);
		}

		member.setName(staff.getStaffName());
		member.setEmail(staff.getEmail());
		member.setMobile(staff.getMobile());
		member.setMemberRole(memberRole);

		TenantMember savedMember = tenantMemberRepository.save(member);

		if (assignDefaultPermissions) {
			permissionService.assignDefaultPermissions(savedMember.getTenantId(), savedMember.getAuthUserId(),
					savedMember.getMemberRole());
		}
	}

	@Transactional(readOnly = true)
	public List<SaasStaffResponse> getDoctorsForClinical(Long tenantId) {
		tenantAccessService.validateTenantAccess(tenantId);

		return staffRepository
				.findByTenantIdAndStaffRoleAndActiveTrueOrderByStaffNameAsc(tenantId, SaasStaffRole.DOCTOR).stream()
				.map(this::toResponse).toList();
	}

	private void deactivateTenantMemberForStaff(SaasStaff staff) {

		if (staff.getTenantId() == null || staff.getAuthUserId() == null) {
			return;
		}

		tenantMemberRepository.findByTenantIdAndAuthUserIdAndActiveTrue(staff.getTenantId(), staff.getAuthUserId())
				.ifPresent(member -> {
					member.setActive(false);
					tenantMemberRepository.save(member);
				});
	}

	private void validateRequest(SaasStaffRequest request) {

		if (request == null) {
			throw new RuntimeException("Staff request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getStaffName() == null || request.getStaffName().isBlank()) {
			throw new RuntimeException("Staff name is required");
		}

		if (request.getStaffRole() == null || request.getStaffRole().isBlank()) {
			throw new RuntimeException("Staff role is required");
		}

		if (request.getEmail() == null || request.getEmail().isBlank()) {
			throw new RuntimeException("Email is required");
		}

		if (request.getMobile() == null || request.getMobile().isBlank()) {
			throw new RuntimeException("Mobile is required");
		}

		SaasStaffRole staffRole;

		try {
			staffRole = SaasStaffRole.valueOf(request.getStaffRole().toUpperCase());
		} catch (Exception e) {
			throw new RuntimeException("Invalid staff role: " + request.getStaffRole());
		}

		if (staffRole == SaasStaffRole.OWNER) {
			throw new RuntimeException("OWNER role cannot be assigned manually");
		}

		if (staffRole == SaasStaffRole.DOCTOR) {
			validateDoctorFields(request);
		}
	}

	private void validateDoctorFields(SaasStaffRequest request) {

		if (request.getDepartment() == null || request.getDepartment().isBlank()) {
			throw new RuntimeException("Department is required for doctor");
		}

		if (request.getSpecialization() == null || request.getSpecialization().isBlank()) {
			throw new RuntimeException("Specialization is required for doctor");
		}

		if (request.getQualification() == null || request.getQualification().isBlank()) {
			throw new RuntimeException("Qualification is required for doctor");
		}

		if (request.getConsultationFee() == null) {
			throw new RuntimeException("Consultation fee is required for doctor");
		}
	}

	private String generateStaffCode(SaasStaff staff) {
		return "STF-" + staff.getTenantId() + "-" + String.format("%05d", staff.getId());
	}

	private String clean(String value) {
		return value == null ? null : value.trim();
	}

	private SaasStaffResponse toResponse(SaasStaff staff) {
		return new SaasStaffResponse(staff.getId(), staff.getTenantId(), staff.getAuthUserId(), staff.getStaffCode(),
				staff.getStaffName(), staff.getEmail(), staff.getMobile(),
				staff.getStaffRole() == null ? null : staff.getStaffRole().name(),
				staff.getStatus() == null ? null : staff.getStatus().name(), staff.getDepartment(),
				staff.getDesignation(), staff.getGender(), staff.getDateOfBirth(), staff.getJoiningDate(),
				staff.getAddress(), staff.getCity(), staff.getState(), staff.getPincode(), staff.getSalary(),
				staff.getEmergencyContactName(), staff.getEmergencyContactMobile(), staff.getQualification(),
				staff.getSpecialization(), staff.getRegistrationNumber(), staff.getExperienceYears(),
				staff.getConsultationFee(), staff.getOnlineConsultationFee(), staff.getOnlineConsultationEnabled(),
				staff.getActive(), staff.getCreatedAt());
	}
}