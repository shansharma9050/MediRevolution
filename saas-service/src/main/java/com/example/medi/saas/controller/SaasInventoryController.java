package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasInventorySummaryResponse;
import com.example.medi.saas.dto.SaasMedicineRequest;
import com.example.medi.saas.dto.SaasMedicineResponse;
import com.example.medi.saas.dto.SaasMedicineStockRequest;
import com.example.medi.saas.dto.SaasMedicineStockResponse;
import com.example.medi.saas.dto.SaasStockAdjustmentRequest;
import com.example.medi.saas.dto.SaasStockMovementResponse;
import com.example.medi.saas.service.SaasInventoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/inventory")
public class SaasInventoryController {

	private final SaasInventoryService inventoryService;

	public SaasInventoryController(SaasInventoryService inventoryService) {
		this.inventoryService = inventoryService;
	}

	@PostMapping("/medicines")
	public SaasMedicineResponse createMedicine(@RequestBody SaasMedicineRequest request) {
		return inventoryService.createMedicine(request);
	}

	@GetMapping("/medicines")
	public List<SaasMedicineResponse> getMedicines(@RequestParam Long tenantId) {
		return inventoryService.getMedicines(tenantId);
	}

	@GetMapping("/medicines/search")
	public List<SaasMedicineResponse> searchMedicines(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword) {
		return inventoryService.searchMedicines(tenantId, keyword);
	}

	@PostMapping("/stocks")
	public SaasMedicineStockResponse addStock(@RequestBody SaasMedicineStockRequest request) {
		return inventoryService.addStock(request);
	}

	@GetMapping("/stocks")
	public List<SaasMedicineStockResponse> getStocks(@RequestParam Long tenantId) {
		return inventoryService.getStocks(tenantId);
	}

	@GetMapping("/stocks/search")
	public List<SaasMedicineStockResponse> searchStocks(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword) {
		return inventoryService.searchStocks(tenantId, keyword);
	}

	@GetMapping("/stocks/medicine")
	public List<SaasMedicineStockResponse> getStockByMedicine(@RequestParam Long tenantId,

			@RequestParam Long medicineId) {
		return inventoryService.getStockByMedicine(tenantId, medicineId);
	}

	@GetMapping("/stocks/low")
	public List<SaasMedicineStockResponse> getLowStock(@RequestParam Long tenantId) {
		return inventoryService.getLowStock(tenantId);
	}

	@GetMapping("/stocks/expired")
	public List<SaasMedicineStockResponse> getExpiredStock(@RequestParam Long tenantId) {
		return inventoryService.getExpiredStock(tenantId);
	}

	@GetMapping("/stocks/near-expiry")
	public List<SaasMedicineStockResponse> getNearExpiryStock(@RequestParam Long tenantId,

			@RequestParam(required = false, defaultValue = "90") Integer days) {
		return inventoryService.getNearExpiryStock(tenantId, days);
	}

	@GetMapping("/summary")
	public SaasInventorySummaryResponse getInventorySummary(@RequestParam Long tenantId) {
		return inventoryService.getInventorySummary(tenantId);
	}

	@GetMapping("/movements")
	public List<SaasStockMovementResponse> getMovements(@RequestParam Long tenantId) {
		return inventoryService.getMovements(tenantId);
	}

	@GetMapping("/movements/stock")
	public List<SaasStockMovementResponse> getStockMovements(@RequestParam Long tenantId,

			@RequestParam Long stockId) {
		return inventoryService.getStockMovements(tenantId, stockId);
	}

	@PutMapping("/stocks/adjust")
	public SaasMedicineStockResponse adjustStock(@RequestBody SaasStockAdjustmentRequest request) {
		return inventoryService.adjustStock(request);
	}
}