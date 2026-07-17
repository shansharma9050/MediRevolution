package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasExpiryConfigurationRequest;
import com.example.medi.saas.dto.SaasExpiryConfigurationResponse;
import com.example.medi.saas.service.SaasExpiryConfigurationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/saas/expiry-management/configuration")
public class SaasExpiryConfigurationController {

	private final SaasExpiryConfigurationService configurationService;

	public SaasExpiryConfigurationController(SaasExpiryConfigurationService configurationService) {
		this.configurationService = configurationService;
	}

	@GetMapping
	public SaasExpiryConfigurationResponse getConfiguration(@RequestParam Long tenantId) {

		return configurationService.getConfiguration(tenantId);
	}

	@PutMapping
	public SaasExpiryConfigurationResponse updateConfiguration(@RequestBody SaasExpiryConfigurationRequest request) {

		return configurationService.updateConfiguration(request);
	}
}