package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasPurchaseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/purchases")
public class SaasPurchaseController {

	private final SaasPurchaseService purchaseService;

	public SaasPurchaseController(SaasPurchaseService purchaseService) {
		this.purchaseService = purchaseService;
	}

	@GetMapping
	public List<SaasPurchaseResponse> getPurchases(@RequestParam Long tenantId) {
		return purchaseService.getPurchases(tenantId);
	}

	@GetMapping("/search")
	public List<SaasPurchaseResponse> searchPurchases(@RequestParam Long tenantId,
			@RequestParam(required = false) String keyword) {
		return purchaseService.searchPurchases(tenantId, keyword);
	}

	@GetMapping("/summary")
	public SaasPurchaseSummaryResponse getSummary(@RequestParam Long tenantId) {
		return purchaseService.getSummary(tenantId);
	}

	@GetMapping("/{purchaseId}")
	public SaasPurchaseResponse getPurchase(@PathVariable Long purchaseId, @RequestParam Long tenantId) {
		return purchaseService.getPurchase(tenantId, purchaseId);
	}

	@PostMapping
	public SaasPurchaseResponse createPurchase(@RequestBody SaasPurchaseRequest request) {
		return purchaseService.createPurchase(request);
	}
}