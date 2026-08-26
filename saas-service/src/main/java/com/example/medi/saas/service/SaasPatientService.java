package com.example.medi.saas.service;

import com.example.medi.saas.client.AuthClient;
import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.AuthUserResponse;
import com.example.medi.saas.dto.CreateSaasPatientRequest;
import com.example.medi.saas.dto.SaasPatientRequest;
import com.example.medi.saas.dto.SaasPatientResponse;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class SaasPatientService {

	private final SaasPatientRepository patientRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final AuthClient authClient;
	private final String internalServiceKey;

	public SaasPatientService(SaasPatientRepository patientRepository, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService, AuthClient authClient,
			@Value("${internal.service.key}") String internalServiceKey) {
		this.patientRepository = patientRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.authClient = authClient;
		this.internalServiceKey = internalServiceKey;
	}

	public SaasPatientResponse createPatient(SaasPatientRequest request, String authorization) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		permissionService.requirePermission(tenantId, TenantModule.PATIENTS, SaasPermissionAction.CREATE);

		tenantAccessService.validateTenantAccess(tenantId);

		/*
		 * ============================================================ LOGIN CREDENTIAL
		 * VALIDATION ============================================================
		 *
		 * New patient must have email because email is the login ID.
		 */
		if (request.getEmail() == null || request.getEmail().isBlank()) {

			throw new RuntimeException("Patient email is required for login");
		}

		if (request.getPassword() == null || request.getPassword().isBlank()) {

			throw new RuntimeException("Patient password is required for login");
		}

		if (request.getPassword().length() < 6) {

			throw new RuntimeException("Patient password must be at least 6 characters");
		}

		/*
		 * ============================================================ CREATE / REUSE
		 * AUTH USER ============================================================
		 */

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

		/*
		 * Ensure Auth role is actually PATIENT.
		 */
		if (authUser.getRole() == null || !"PATIENT".equalsIgnoreCase(authUser.getRole())) {

			throw new RuntimeException("Invalid authentication role for patient");
		}

		/*
		 * ============================================================ CREATE SAAS
		 * PATIENT ============================================================
		 */

		SaasPatient patient = new SaasPatient();

		patient.setTenantId(tenantId);

		patient.setAuthUserId(authUser.getId());

		patient.setPatientName(request.getPatientName().trim());

		patient.setAuthUserId(authUser.getId());

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

		/*
		 * Generate patient code after ID exists.
		 */
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

		result.addAll(patientRepository.findByTenantIdAndActiveTrueAndMobileContainingOrderByCreatedAtDesc(tenantId,
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

		return new SaasPatientResponse(patient.getId(), patient.getTenantId(), patient.getPatientCode(),
				patient.getPatientName(), patient.getMobile(), patient.getEmail(), patient.getGender(),
				patient.getDateOfBirth(), patient.getAge(), patient.getBloodGroup(), patient.getAddress(),
				patient.getCity(), patient.getState(), patient.getPincode(), patient.getEmergencyContactName(),
				patient.getEmergencyContactMobile(), patient.getAllergies(), patient.getExistingDiseases(),
				patient.getNotes(), patient.getActive(), patient.getCreatedAt());
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