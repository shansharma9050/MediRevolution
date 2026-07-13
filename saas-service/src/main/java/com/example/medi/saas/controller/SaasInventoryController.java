package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
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
    public List<SaasMedicineResponse> searchMedicines(
            @RequestParam Long tenantId,
            @RequestParam(required = false) String keyword
    ) {
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

    @GetMapping("/stocks/medicine")
    public List<SaasMedicineStockResponse> getStockByMedicine(
            @RequestParam Long tenantId,
            @RequestParam Long medicineId
    ) {
        return inventoryService.getStockByMedicine(tenantId, medicineId);
    }

    @GetMapping("/stocks/low")
    public List<SaasMedicineStockResponse> getLowStock(@RequestParam Long tenantId) {
        return inventoryService.getLowStock(tenantId);
    }

    @PutMapping("/stocks/adjust")
    public SaasMedicineStockResponse adjustStock(@RequestBody SaasStockAdjustmentRequest request) {
        return inventoryService.adjustStock(request);
    }
}