package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasExpiryActionRequest;
import com.example.medi.saas.dto.SaasExpiryActionResponse;
import com.example.medi.saas.dto.SaasExpiryAlertResponse;
import com.example.medi.saas.dto.SaasExpiryBatchResponse;
import com.example.medi.saas.dto.SaasExpirySearchRequest;
import com.example.medi.saas.dto.SaasExpirySummaryResponse;
import com.example.medi.saas.dto.SaasSupplierExpiryResponse;
import com.example.medi.saas.service.SaasExpiryManagementService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/expiry-management")
public class SaasExpiryManagementController {

	private final SaasExpiryManagementService expiryService;

	public SaasExpiryManagementController(SaasExpiryManagementService expiryService) {
		this.expiryService = expiryService;
	}

	@GetMapping("/batches")
	public List<SaasExpiryBatchResponse> getAllTrackedBatches(@RequestParam Long tenantId) {

		return expiryService.getAllTrackedBatches(tenantId);
	}

	@GetMapping("/batches/expired")
	public List<SaasExpiryBatchResponse> getExpiredBatches(@RequestParam Long tenantId) {

		return expiryService.getExpiredBatches(tenantId);
	}

	@GetMapping("/batches/expires-today")
	public List<SaasExpiryBatchResponse> getExpiringTodayBatches(@RequestParam Long tenantId) {

		return expiryService.getExpiringTodayBatches(tenantId);
	}

	@GetMapping("/batches/critical")
	public List<SaasExpiryBatchResponse> getCriticalBatches(@RequestParam Long tenantId) {

		return expiryService.getCriticalBatches(tenantId);
	}

	@GetMapping("/batches/near-expiry")
	public List<SaasExpiryBatchResponse> getNearExpiryBatches(@RequestParam Long tenantId) {

		return expiryService.getNearExpiryBatches(tenantId);
	}

	@GetMapping("/batches/search")
	public List<SaasExpiryBatchResponse> searchBatches(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword,

			@RequestParam(required = false) String expiryStatus,

			@RequestParam(required = false) Long supplierId,

			@RequestParam(required = false) Integer days,

			@RequestParam(required = false) Boolean includeZeroStock) {

		SaasExpirySearchRequest request = new SaasExpirySearchRequest();

		request.setTenantId(tenantId);

		request.setKeyword(keyword);

		request.setExpiryStatus(expiryStatus);

		request.setSupplierId(supplierId);

		request.setDays(days);

		request.setIncludeZeroStock(includeZeroStock);

		return expiryService.searchBatches(request);
	}

	@GetMapping("/summary")
	public SaasExpirySummaryResponse getSummary(@RequestParam Long tenantId) {

		return expiryService.getSummary(tenantId);
	}

	@GetMapping("/suppliers")
	public List<SaasSupplierExpiryResponse> getSupplierWiseExpiry(@RequestParam Long tenantId) {

		return expiryService.getSupplierWiseExpiry(tenantId);
	}

	@GetMapping("/alerts")
	public List<SaasExpiryAlertResponse> getAlerts(@RequestParam Long tenantId) {

		return expiryService.getAlerts(tenantId);
	}

	@GetMapping("/actions")
	public List<SaasExpiryActionResponse> getActions(@RequestParam Long tenantId) {

		return expiryService.getActions(tenantId);
	}

	@GetMapping("/actions/search")
	public List<SaasExpiryActionResponse> searchActions(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword) {

		return expiryService.searchActions(tenantId, keyword);
	}

	@GetMapping("/actions/{actionId}")
	public SaasExpiryActionResponse getAction(@PathVariable Long actionId,

			@RequestParam Long tenantId) {

		return expiryService.getAction(tenantId, actionId);
	}

	@PostMapping("/actions")
	public SaasExpiryActionResponse createAction(@RequestBody SaasExpiryActionRequest request) {

		return expiryService.createAction(request);
	}

	@PostMapping("/auto-quarantine")
	public Long autoQuarantineExpiredStock(@RequestParam Long tenantId) {

		return expiryService.autoQuarantineExpiredStock(tenantId);
	}
}