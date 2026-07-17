package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasCustomerRequest;
import com.example.medi.saas.dto.SaasCustomerResponse;
import com.example.medi.saas.service.SaasCustomerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/customers")
public class SaasCustomerController {

	private final SaasCustomerService customerService;

	public SaasCustomerController(SaasCustomerService customerService) {
		this.customerService = customerService;
	}

	@GetMapping
	public List<SaasCustomerResponse> getCustomers(@RequestParam Long tenantId,

			@RequestParam(required = false, defaultValue = "false") Boolean activeOnly) {

		return customerService.getCustomers(tenantId, activeOnly);
	}

	@GetMapping("/search")
	public List<SaasCustomerResponse> searchCustomers(@RequestParam Long tenantId, @RequestParam String keyword) {

		return customerService.searchCustomers(tenantId, keyword);
	}

	@GetMapping("/{customerId}")
	public SaasCustomerResponse getCustomer(@PathVariable Long customerId, @RequestParam Long tenantId) {

		return customerService.getCustomer(tenantId, customerId);
	}

	@PostMapping
	public SaasCustomerResponse createCustomer(@RequestBody SaasCustomerRequest request) {

		return customerService.createCustomer(request);
	}

	@PutMapping("/{customerId}")
	public SaasCustomerResponse updateCustomer(@PathVariable Long customerId,

			@RequestParam Long tenantId,

			@RequestBody SaasCustomerRequest request) {

		return customerService.updateCustomer(tenantId, customerId, request);
	}

	@DeleteMapping("/{customerId}")
	public SaasCustomerResponse deactivateCustomer(@PathVariable Long customerId, @RequestParam Long tenantId) {

		return customerService.deactivateCustomer(tenantId, customerId);
	}

	@PatchMapping("/{customerId}/activate")
	public SaasCustomerResponse activateCustomer(@PathVariable Long customerId, @RequestParam Long tenantId) {

		return customerService.activateCustomer(tenantId, customerId);
	}
}