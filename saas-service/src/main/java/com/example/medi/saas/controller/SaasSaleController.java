package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasSaleRequest;
import com.example.medi.saas.dto.SaasSaleResponse;
import com.example.medi.saas.dto.SaasSaleSummaryResponse;
import com.example.medi.saas.service.SaasSaleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/sales")
public class SaasSaleController {

	private final SaasSaleService saleService;

	public SaasSaleController(SaasSaleService saleService) {
		this.saleService = saleService;
	}

	@GetMapping
	public List<SaasSaleResponse> getSales(@RequestParam Long tenantId) {
		return saleService.getSales(tenantId);
	}

	@GetMapping("/search")
	public List<SaasSaleResponse> searchSales(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword) {
		return saleService.searchSales(tenantId, keyword);
	}

	@GetMapping("/summary")
	public SaasSaleSummaryResponse getSummary(@RequestParam Long tenantId) {
		return saleService.getSummary(tenantId);
	}

	@GetMapping("/{saleId}")
	public SaasSaleResponse getSale(@PathVariable Long saleId,

			@RequestParam Long tenantId) {
		return saleService.getSale(tenantId, saleId);
	}

	@PostMapping
	public SaasSaleResponse createSale(@RequestBody SaasSaleRequest request) {
		return saleService.createSale(request);
	}
}