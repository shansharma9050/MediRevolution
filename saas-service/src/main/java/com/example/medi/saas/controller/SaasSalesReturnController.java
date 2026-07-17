package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasSalesReturnService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/sales-returns")
public class SaasSalesReturnController {

	private final SaasSalesReturnService returnService;

	public SaasSalesReturnController(SaasSalesReturnService returnService) {
		this.returnService = returnService;
	}

	@GetMapping
	public List<SaasSalesReturnResponse> getReturns(@RequestParam Long tenantId) {
		return returnService.getReturns(tenantId);
	}

	@GetMapping("/search")
	public List<SaasSalesReturnResponse> searchReturns(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword) {
		return returnService.searchReturns(tenantId, keyword);
	}

	@GetMapping("/summary")
	public SaasSalesReturnSummaryResponse getSummary(@RequestParam Long tenantId) {
		return returnService.getSummary(tenantId);
	}

	@GetMapping("/{returnId}")
	public SaasSalesReturnResponse getReturn(@PathVariable Long returnId,

			@RequestParam Long tenantId) {
		return returnService.getReturn(tenantId, returnId);
	}

	@GetMapping("/sale/{saleId}/availability")
	public List<SaasSalesReturnAvailabilityResponse> getSaleReturnAvailability(@PathVariable Long saleId,

			@RequestParam Long tenantId) {
		return returnService.getSaleReturnAvailability(tenantId, saleId);
	}

	@PostMapping
	public SaasSalesReturnResponse createReturn(@RequestBody SaasSalesReturnRequest request) {
		return returnService.createReturn(request);
	}
}