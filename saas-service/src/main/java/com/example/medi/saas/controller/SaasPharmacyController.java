package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasPharmacyPrescriptionOptionResponse;
import com.example.medi.saas.dto.SaasPharmacySaleRequest;
import com.example.medi.saas.dto.SaasPharmacySaleResponse;
import com.example.medi.saas.service.SaasPharmacyService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/pharmacy")
public class SaasPharmacyController {

	private final SaasPharmacyService pharmacyService;

	public SaasPharmacyController(SaasPharmacyService pharmacyService) {

		this.pharmacyService = pharmacyService;
	}

	/*
	 * ================================================================ SALE
	 * ================================================================
	 */

	@PostMapping("/sales")
	public SaasPharmacySaleResponse createSale(@RequestHeader("Authorization") String authorization,

			@RequestBody SaasPharmacySaleRequest request) {

		return pharmacyService.createSale(authorization, request);
	}

	@GetMapping("/sales")
	public List<SaasPharmacySaleResponse> getSales(@RequestParam Long tenantId) {

		return pharmacyService.getSales(tenantId);
	}

	@GetMapping("/sales/{saleId}")
	public SaasPharmacySaleResponse getSale(@PathVariable Long saleId, @RequestParam Long tenantId) {

		return pharmacyService.getSale(tenantId, saleId);
	}

	@GetMapping("/sales/patient")
	public List<SaasPharmacySaleResponse> getPatientSales(@RequestParam Long tenantId, @RequestParam Long patientId) {

		return pharmacyService.getPatientSales(tenantId, patientId);
	}

	/*
	 * ================================================================
	 * PRESCRIPTIONS AVAILABLE FOR DISPENSING
	 * ================================================================
	 */

	@GetMapping("/prescriptions")
	public List<SaasPharmacyPrescriptionOptionResponse> getDispensablePrescriptions(@RequestParam Long tenantId) {

		return pharmacyService.getDispensablePrescriptions(tenantId);
	}

	/*
	 * ================================================================ PATIENT SELF
	 * HISTORY ================================================================
	 */

	@GetMapping("/sales/my")
	public List<SaasPharmacySaleResponse> getMySales(@RequestParam Long tenantId) {

		return pharmacyService.getMySales(tenantId);
	}

	@GetMapping("/sales/my/{saleId}")
	public SaasPharmacySaleResponse getMySale(@PathVariable Long saleId, @RequestParam Long tenantId) {

		return pharmacyService.getMySale(tenantId, saleId);
	}
}