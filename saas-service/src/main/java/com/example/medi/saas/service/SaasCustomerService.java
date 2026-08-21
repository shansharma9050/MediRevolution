package com.example.medi.saas.service;

import com.example.medi.saas.client.AuthClient;
import com.example.medi.saas.dto.AuthCustomerCreateRequest;
import com.example.medi.saas.dto.AuthUserResponse;
import com.example.medi.saas.dto.SaasCustomerRequest;
import com.example.medi.saas.dto.SaasCustomerResponse;
import com.example.medi.saas.entity.SaasCustomer;
import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.entity.TenantMember;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantMemberRole;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasCustomerRepository;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class SaasCustomerService {

	private static final Set<String> ALLOWED_CUSTOMER_TYPES = Set.of("RETAILER", "PHARMACY", "HOSPITAL", "CLINIC",
			"WHOLESALER", "DISTRIBUTOR", "OTHER");

	private final SaasCustomerRepository customerRepository;

	private final TenantAccessService tenantAccessService;

	private final SaasPermissionService permissionService;

	private final TenantMemberRepository tenantMemberRepository;

	private final AuthClient authClient;

	private final HttpServletRequest httpServletRequest;

	public SaasCustomerService(SaasCustomerRepository customerRepository, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService, TenantMemberRepository tenantMemberRepository,
			AuthClient authClient, HttpServletRequest httpServletRequest) {

		this.customerRepository = customerRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.tenantMemberRepository = tenantMemberRepository;
		this.authClient = authClient;
		this.httpServletRequest = httpServletRequest;
	}

	// ============================================================
	// GET CUSTOMERS
	// ============================================================

	public List<SaasCustomerResponse> getCustomers(Long tenantId, Boolean activeOnly) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.CUSTOMERS, SaasPermissionAction.VIEW);

		List<SaasCustomer> customers;

		if (Boolean.TRUE.equals(activeOnly)) {

			customers = customerRepository.findByTenantIdAndActiveTrueOrderByCustomerNameAsc(tenantId);

		} else {

			customers = customerRepository.findByTenantIdOrderByCustomerNameAsc(tenantId);
		}

		return customers.stream().map(this::toResponse).toList();
	}

	// ============================================================
	// SEARCH CUSTOMERS
	// ============================================================

	public List<SaasCustomerResponse> searchCustomers(Long tenantId, String keyword) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.CUSTOMERS, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {

			return getCustomers(tenantId, false);
		}

		return customerRepository.searchCustomers(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	// ============================================================
	// GET CUSTOMER
	// ============================================================

	public SaasCustomerResponse getCustomer(Long tenantId, Long customerId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.CUSTOMERS, SaasPermissionAction.VIEW);

		return toResponse(findCustomer(tenantId, customerId));
	}

	// ============================================================
	// CREATE CUSTOMER
	// ============================================================

	@Transactional
	public SaasCustomerResponse createCustomer(SaasCustomerRequest request) {

		Long tenantId = requireTenantId(request);

		Tenant tenant = validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.CUSTOMERS, SaasPermissionAction.CREATE);

		validateRequest(request);

		String customerCode = normalizeUppercase(request.getCustomerCode());

		validateCustomerCodeDuplicate(tenantId, customerCode, null);

		validateGstinDuplicate(tenantId, request.getGstin(), null);

		/*
		 * Every customer gets a login account.
		 */
		validateNewCustomerLoginRequest(request);

		Long authUserId = resolveCustomerAuthUserId(request);

		/*
		 * Create SaaS customer.
		 */
		SaasCustomer customer = new SaasCustomer();

		customer.setTenantId(tenantId);

		applyRequest(customer, request);

		customer.setActive(true);

		customer.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		/*
		 * Only store Auth user reference. Never store password.
		 */
		customer.setAuthUserId(authUserId);

		SaasCustomer savedCustomer = customerRepository.save(customer);

		/*
		 * Every customer becomes a CUSTOMER workspace member.
		 */
		syncTenantMemberForCustomer(savedCustomer, true);

		return toResponse(savedCustomer);
	}

	// ============================================================
	// UPDATE CUSTOMER
	// ============================================================

	@Transactional
	public SaasCustomerResponse updateCustomer(Long tenantId, Long customerId, SaasCustomerRequest request) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.CUSTOMERS, SaasPermissionAction.UPDATE);

		if (request == null) {
			throw new RuntimeException("Customer request is required");
		}

		request.setTenantId(tenantId);

		validateRequest(request);

		SaasCustomer customer = findCustomer(tenantId, customerId);

		String customerCode = normalizeUppercase(request.getCustomerCode());

		validateCustomerCodeDuplicate(tenantId, customerCode, customerId);

		validateGstinDuplicate(tenantId, request.getGstin(), customerId);

		/*
		 * Login email is the Auth identity. Do not silently change it here.
		 */
		if (customer.getAuthUserId() != null) {

			String existingEmail = normalizeLowercase(customer.getEmail());

			String requestedEmail = normalizeLowercase(request.getEmail());

			if (!sameValue(existingEmail, requestedEmail)) {

				throw new RuntimeException("Customer login email cannot be changed from customer management");
			}
		}

		/*
		 * Legacy customer without login: create a customer login now.
		 */
		if (customer.getAuthUserId() == null) {

			validateNewCustomerLoginRequest(request);

			Long authUserId = resolveCustomerAuthUserId(request);

			customer.setAuthUserId(authUserId);
		}

		applyRequest(customer, request);

		customer.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasCustomer saved = customerRepository.save(customer);

		/*
		 * Customer remains CUSTOMER regardless of customer type.
		 */
		syncTenantMemberForCustomer(saved, false);

		return toResponse(saved);
	}

	// ============================================================
	// DEACTIVATE CUSTOMER
	// ============================================================

	@Transactional
	public SaasCustomerResponse deactivateCustomer(Long tenantId, Long customerId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.CUSTOMERS, SaasPermissionAction.DELETE);

		SaasCustomer customer = findCustomer(tenantId, customerId);

		customer.setActive(false);

		customer.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasCustomer saved = customerRepository.save(customer);

		/*
		 * Deactivate only this workspace membership. Do not globally disable Auth User.
		 */
		deactivateTenantMemberForCustomer(saved);

		return toResponse(saved);
	}

	// ============================================================
	// ACTIVATE CUSTOMER
	// ============================================================

	@Transactional
	public SaasCustomerResponse activateCustomer(Long tenantId, Long customerId) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.CUSTOMERS, SaasPermissionAction.UPDATE);

		SaasCustomer customer = findCustomer(tenantId, customerId);

		customer.setActive(true);

		customer.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasCustomer saved = customerRepository.save(customer);

		if (saved.getAuthUserId() != null) {

			syncTenantMemberForCustomer(saved, false);
		}

		return toResponse(saved);
	}

	// ============================================================
	// AUTH CUSTOMER CREATION
	// ============================================================

	private Long resolveCustomerAuthUserId(SaasCustomerRequest request) {

		AuthCustomerCreateRequest authRequest = new AuthCustomerCreateRequest();

		authRequest.setFullName(request.getCustomerName());

		authRequest.setEmail(request.getEmail());

		authRequest.setMobile(request.getMobile());

		authRequest.setPassword(request.getPassword());

		authRequest.setRole("SAAS_CUSTOMER");

		String authorization = httpServletRequest.getHeader("Authorization");

		AuthUserResponse authUser = authClient.createSaasCustomer(authorization, authRequest);

		if (authUser == null || authUser.getId() == null) {

			throw new RuntimeException("Unable to create customer login user");
		}

		if (!"SAAS_CUSTOMER".equals(authUser.getRole())) {

			throw new RuntimeException("Customer login user must have SAAS_CUSTOMER role");
		}

		return authUser.getId();
	}

	// ============================================================
	// CUSTOMER TENANT MEMBER
	// ============================================================

	private void syncTenantMemberForCustomer(SaasCustomer customer, boolean assignDefaultPermissions) {

		if (customer == null || customer.getTenantId() == null || customer.getAuthUserId() == null) {

			return;
		}

		TenantMember member = tenantMemberRepository
				.findByTenantIdAndAuthUserIdAndActiveTrue(customer.getTenantId(), customer.getAuthUserId())
				.orElse(null);

		/*
		 * Search inactive membership too. Avoid duplicate membership.
		 */
		if (member == null) {

			member = tenantMemberRepository
					.findByTenantIdAndAuthUserId(customer.getTenantId(), customer.getAuthUserId()).orElse(null);
		}

		if (member == null) {

			member = new TenantMember();

			member.setTenantId(customer.getTenantId());

			member.setAuthUserId(customer.getAuthUserId());
		}

		member.setName(customer.getCustomerName());

		member.setEmail(customer.getEmail());

		member.setMobile(customer.getMobile());

		/*
		 * IMPORTANT:
		 *
		 * CUSTOMER is the tenant member role.
		 *
		 * RETAILER / PHARMACY / HOSPITAL etc. belong to SaasCustomer.customerType.
		 */
		member.setMemberRole(TenantMemberRole.CUSTOMER);

		member.setActive(customer.getActive());

		TenantMember savedMember = tenantMemberRepository.save(member);

		if (assignDefaultPermissions) {

			permissionService.assignDefaultPermissions(savedMember.getTenantId(), savedMember.getAuthUserId(),
					savedMember.getMemberRole());
		}
	}

	// ============================================================
	// DEACTIVATE CUSTOMER MEMBERSHIP
	// ============================================================

	private void deactivateTenantMemberForCustomer(SaasCustomer customer) {

		if (customer == null || customer.getTenantId() == null || customer.getAuthUserId() == null) {

			return;
		}

		tenantMemberRepository
				.findByTenantIdAndAuthUserIdAndActiveTrue(customer.getTenantId(), customer.getAuthUserId())
				.ifPresent(member -> {

					member.setActive(false);

					tenantMemberRepository.save(member);
				});
	}

	// ============================================================
	// APPLY CUSTOMER REQUEST
	// ============================================================

	private void applyRequest(SaasCustomer customer, SaasCustomerRequest request) {

		customer.setCustomerCode(normalizeUppercase(request.getCustomerCode()));

		customer.setCustomerName(normalizeRequired(request.getCustomerName(), "Customer name"));

		customer.setCustomerType(normalizeCustomerType(request.getCustomerType()));

		customer.setContactPersonName(normalizeOptional(request.getContactPersonName()));

		customer.setMobile(normalizeOptional(request.getMobile()));

		customer.setAlternateMobile(normalizeOptional(request.getAlternateMobile()));

		customer.setEmail(normalizeLowercase(request.getEmail()));

		customer.setGstin(normalizeUppercase(request.getGstin()));

		customer.setDrugLicenseNumber(normalizeUppercase(request.getDrugLicenseNumber()));

		customer.setAddress(normalizeOptional(request.getAddress()));

		customer.setCity(normalizeOptional(request.getCity()));

		customer.setDistrict(normalizeOptional(request.getDistrict()));

		customer.setState(normalizeOptional(request.getState()));

		customer.setPincode(normalizeOptional(request.getPincode()));

		customer.setOpeningBalance(nonNegativeAmount(request.getOpeningBalance(), "Opening balance"));

		customer.setCreditLimit(nonNegativeAmount(request.getCreditLimit(), "Credit limit"));

		customer.setPaymentTermsDays(nonNegativeInteger(request.getPaymentTermsDays(), "Payment terms"));

		customer.setDiscountPercentage(validPercentage(request.getDiscountPercentage(), "Discount percentage"));
	}

	// ============================================================
	// VALIDATION
	// ============================================================

	private void validateRequest(SaasCustomerRequest request) {

		if (request == null) {

			throw new RuntimeException("Customer request is required");
		}

		normalizeRequired(request.getCustomerCode(), "Customer code");

		normalizeRequired(request.getCustomerName(), "Customer name");

		normalizeCustomerType(request.getCustomerType());

		validateMobile(request.getMobile(), "Mobile number");

		validateMobile(request.getAlternateMobile(), "Alternate mobile number");

		if (request.getEmail() == null || request.getEmail().isBlank()) {

			throw new RuntimeException("Email is required for customer login");
		}

		if (!request.getEmail().trim().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {

			throw new RuntimeException("Please enter a valid email address");
		}

		if (request.getPincode() != null && !request.getPincode().isBlank()
				&& !request.getPincode().trim().matches("[0-9]{4,12}")) {

			throw new RuntimeException("Please enter a valid pincode");
		}

		nonNegativeAmount(request.getOpeningBalance(), "Opening balance");

		nonNegativeAmount(request.getCreditLimit(), "Credit limit");

		nonNegativeInteger(request.getPaymentTermsDays(), "Payment terms");

		validPercentage(request.getDiscountPercentage(), "Discount percentage");
	}

	private void validateNewCustomerLoginRequest(SaasCustomerRequest request) {

		if (request.getEmail() == null || request.getEmail().isBlank()) {

			throw new RuntimeException("Email is required for customer login");
		}

		if (request.getMobile() == null || request.getMobile().isBlank()) {

			throw new RuntimeException("Mobile is required for customer login");
		}

		if (request.getPassword() == null || request.getPassword().isBlank()) {

			throw new RuntimeException("Customer login password is required");
		}

		if (request.getPassword().length() < 6) {

			throw new RuntimeException("Customer login password must be at least 6 characters");
		}
	}

	// ============================================================
	// DUPLICATE VALIDATION
	// ============================================================

	private void validateCustomerCodeDuplicate(Long tenantId, String customerCode, Long currentCustomerId) {

		if (currentCustomerId == null) {

			customerRepository.findByTenantIdAndCustomerCodeIgnoreCase(tenantId, customerCode).ifPresent(duplicate -> {

				throw new RuntimeException("Customer code already exists in this workspace");
			});

			return;
		}

		customerRepository.findByTenantIdAndCustomerCodeIgnoreCaseAndIdNot(tenantId, customerCode, currentCustomerId)
				.ifPresent(duplicate -> {

					throw new RuntimeException("Customer code already exists in this workspace");
				});
	}

	private void validateGstinDuplicate(Long tenantId, String gstin, Long currentCustomerId) {

		String normalizedGstin = normalizeUppercase(gstin);

		if (normalizedGstin == null) {
			return;
		}

		if (currentCustomerId == null) {

			customerRepository.findByTenantIdAndGstinIgnoreCase(tenantId, normalizedGstin).ifPresent(duplicate -> {

				throw new RuntimeException("GSTIN already belongs to another customer");
			});

			return;
		}

		customerRepository.findByTenantIdAndGstinIgnoreCaseAndIdNot(tenantId, normalizedGstin, currentCustomerId)
				.ifPresent(duplicate -> {

					throw new RuntimeException("GSTIN already belongs to another customer");
				});
	}

	// ============================================================
	// CUSTOMER FIND
	// ============================================================

	private SaasCustomer findCustomer(Long tenantId, Long customerId) {

		if (customerId == null) {

			throw new RuntimeException("Customer id is required");
		}

		return customerRepository.findByIdAndTenantId(customerId, tenantId)
				.orElseThrow(() -> new RuntimeException("Customer not found"));
	}

	// ============================================================
	// WORKSPACE VALIDATION
	// ============================================================

	private Tenant validateWorkspace(Long tenantId) {

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().trim().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType) && !"RETAILER".equals(tenantType)) {

			throw new RuntimeException("Customers module is available only for Wholesaler and Retailer workspaces");
		}

		return tenant;
	}

	private Long requireTenantId(SaasCustomerRequest request) {

		if (request == null || request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required");
		}

		return request.getTenantId();
	}

	// ============================================================
	// CUSTOMER TYPE
	// ============================================================

	private String normalizeCustomerType(String value) {

		String type = normalizeUppercase(value);

		if (type == null) {

			throw new RuntimeException("Customer type is required");
		}

		if (!ALLOWED_CUSTOMER_TYPES.contains(type)) {

			throw new RuntimeException("Invalid customer type");
		}

		return type;
	}

	// ============================================================
	// MOBILE
	// ============================================================

	private void validateMobile(String value, String fieldName) {

		if (value == null || value.isBlank()) {

			return;
		}

		String mobile = value.replaceAll("\\s+", "");

		if (!mobile.matches("[0-9+\\-]{8,20}")) {

			throw new RuntimeException("Please enter a valid " + fieldName.toLowerCase());
		}
	}

	// ============================================================
	// STRING NORMALIZATION
	// ============================================================

	private String normalizeRequired(String value, String fieldName) {

		String normalized = normalizeOptional(value);

		if (normalized == null) {

			throw new RuntimeException(fieldName + " is required");
		}

		return normalized;
	}

	private String normalizeOptional(String value) {

		if (value == null) {
			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}

	private String normalizeUppercase(String value) {

		String normalized = normalizeOptional(value);

		return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
	}

	private String normalizeLowercase(String value) {

		String normalized = normalizeOptional(value);

		return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
	}

	private boolean sameValue(String first, String second) {

		if (first == null && second == null) {

			return true;
		}

		if (first == null || second == null) {

			return false;
		}

		return first.equalsIgnoreCase(second);
	}

	// ============================================================
	// NUMBER VALIDATION
	// ============================================================

	private BigDecimal nonNegativeAmount(BigDecimal value, String fieldName) {

		BigDecimal amount = value == null ? BigDecimal.ZERO : value;

		if (amount.compareTo(BigDecimal.ZERO) < 0) {

			throw new RuntimeException(fieldName + " cannot be negative");
		}

		return amount;
	}

	private Integer nonNegativeInteger(Integer value, String fieldName) {

		int number = value == null ? 0 : value;

		if (number < 0) {

			throw new RuntimeException(fieldName + " cannot be negative");
		}

		return number;
	}

	private BigDecimal validPercentage(BigDecimal value, String fieldName) {

		BigDecimal percentage = value == null ? BigDecimal.ZERO : value;

		if (percentage.compareTo(BigDecimal.ZERO) < 0 || percentage.compareTo(new BigDecimal("100")) > 0) {

			throw new RuntimeException(fieldName + " must be between 0 and 100");
		}

		return percentage;
	}

	// ============================================================
	// RESPONSE
	// ============================================================

	private SaasCustomerResponse toResponse(SaasCustomer customer) {

		return new SaasCustomerResponse(customer.getId(), customer.getTenantId(), customer.getCustomerCode(),
				customer.getCustomerName(), customer.getCustomerType(), customer.getContactPersonName(),
				customer.getMobile(), customer.getAlternateMobile(), customer.getEmail(), customer.getGstin(),
				customer.getDrugLicenseNumber(), customer.getAddress(), customer.getCity(), customer.getDistrict(),
				customer.getState(), customer.getPincode(), customer.getOpeningBalance(), customer.getCreditLimit(),
				customer.getPaymentTermsDays(), customer.getDiscountPercentage(), customer.getActive(),
				customer.getCreatedAt(), customer.getUpdatedAt());
	}
}