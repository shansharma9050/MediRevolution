package com.example.medi.saas.service;

import com.example.medi.saas.client.MedicineServiceClient;
import com.example.medi.saas.dto.GlobalMedicineRequest;
import com.example.medi.saas.dto.GlobalMedicineResponse;
import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class SaasMedicineMasterService {

	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;
	private final MedicineServiceClient medicineServiceClient;
	private final String internalServiceKey;

	public SaasMedicineMasterService(TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			MedicineServiceClient medicineServiceClient, @Value("${internal.service.key}") String internalServiceKey) {
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
		this.medicineServiceClient = medicineServiceClient;
		this.internalServiceKey = internalServiceKey;
	}

	public List<GlobalMedicineResponse> getAllMedicines(Long tenantId, String authorization) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.MEDICINE_MASTER, SaasPermissionAction.VIEW);

		return medicineServiceClient.getAllMedicines(authorization, internalServiceKey);
	}

	public List<GlobalMedicineResponse> searchMedicines(Long tenantId, String keyword, String authorization) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.MEDICINE_MASTER, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {

			return medicineServiceClient.getAllMedicines(authorization, internalServiceKey);
		}

		return medicineServiceClient.searchMedicines(authorization, internalServiceKey, keyword.trim());
	}

	public GlobalMedicineResponse getMedicine(Long tenantId, Long medicineId, String authorization) {

		validateWorkspace(tenantId);

		if (medicineId == null) {
			throw new RuntimeException("Medicine id is required");
		}

		permissionService.requirePermission(tenantId, TenantModule.MEDICINE_MASTER, SaasPermissionAction.VIEW);

		return medicineServiceClient.getMedicine(authorization, internalServiceKey, medicineId);
	}

	public GlobalMedicineResponse createMedicine(Long tenantId, GlobalMedicineRequest request, String authorization) {

		validateWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.MEDICINE_MASTER, SaasPermissionAction.CREATE);

		validateRequest(request);

		return medicineServiceClient.createMedicine(authorization, internalServiceKey, request);
	}

	public GlobalMedicineResponse updateMedicine(Long tenantId, Long medicineId, GlobalMedicineRequest request,
			String authorization) {

		validateWorkspace(tenantId);

		if (medicineId == null) {
			throw new RuntimeException("Medicine id is required");
		}

		permissionService.requirePermission(tenantId, TenantModule.MEDICINE_MASTER, SaasPermissionAction.UPDATE);

		validateRequest(request);

		return medicineServiceClient.updateMedicine(authorization, internalServiceKey, medicineId, request);
	}

	public GlobalMedicineResponse deactivateMedicine(Long tenantId, Long medicineId, String authorization) {

		validateWorkspace(tenantId);

		if (medicineId == null) {
			throw new RuntimeException("Medicine id is required");
		}

		permissionService.requirePermission(tenantId, TenantModule.MEDICINE_MASTER, SaasPermissionAction.DELETE);

		return medicineServiceClient.deactivateMedicine(authorization, internalServiceKey, medicineId);
	}

	public GlobalMedicineResponse activateMedicine(Long tenantId, Long medicineId, String authorization) {

		validateWorkspace(tenantId);

		if (medicineId == null) {
			throw new RuntimeException("Medicine id is required");
		}

		permissionService.requirePermission(tenantId, TenantModule.MEDICINE_MASTER, SaasPermissionAction.UPDATE);

		return medicineServiceClient.activateMedicine(authorization, internalServiceKey, medicineId);
	}

	private Tenant validateWorkspace(Long tenantId) {

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().trim().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType) && !"RETAILER".equals(tenantType)) {

			throw new RuntimeException("Medicine Master is available only for Wholesaler and Retailer workspaces");
		}

		return tenant;
	}

	private void validateRequest(GlobalMedicineRequest request) {

		if (request == null) {
			throw new RuntimeException("Medicine request is required");
		}

		requireText(request.getMedicineName(), "Medicine name");

		requireText(request.getBrandName(), "Brand name");

		requireText(request.getComposition(), "Composition");

		requireText(request.getManufacturer(), "Manufacturer");

		requireText(request.getCategory(), "Category");

		requireText(request.getMedicineType(), "Medicine type");
	}

	private void requireText(String value, String fieldName) {

		if (value == null || value.isBlank()) {
			throw new RuntimeException(fieldName + " is required");
		}
	}
}