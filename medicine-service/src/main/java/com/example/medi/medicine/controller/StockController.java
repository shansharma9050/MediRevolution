package com.example.medi.medicine.controller;
import org.springframework.web.bind.annotation.*;

import com.example.medi.medicine.dto.ReduceStockRequest;
import com.example.medi.medicine.dto.WholesalerMedicineDashboardResponse;
import com.example.medi.medicine.entity.WholesalerMedicineStock;
import com.example.medi.medicine.service.StockService;

import java.util.List;

@RestController
@RequestMapping("/medicines/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @PostMapping("/{medicineId}")
    public WholesalerMedicineStock addStock(
            @PathVariable Long medicineId,
            @RequestBody WholesalerMedicineStock stock
    ) {
        return stockService.addStock(medicineId, stock);
    }

    @GetMapping("/my")
    public List<WholesalerMedicineStock> getMyStock() {
        return stockService.getMyStock();
    }

    @GetMapping("/search")
    public List<WholesalerMedicineStock> searchStockForRetailer(@RequestParam String keyword) {
        return stockService.searchStockForRetailer(keyword);
    }
    
    @GetMapping("/{stockId}")
    public WholesalerMedicineStock getStockById(@PathVariable Long stockId) {
        return stockService.getStockById(stockId);
    }
    
    @PutMapping("/{stockId}/reduce")
    public WholesalerMedicineStock reduceStock(
            @PathVariable Long stockId,
            @RequestBody ReduceStockRequest request
    ) {
        return stockService.reduceStock(stockId, request.getQuantity());
    }
    
    @GetMapping("/dashboard-counts")
    public WholesalerMedicineDashboardResponse getWholesalerDashboardCounts() {
        return stockService.getWholesalerDashboardCounts();
    }
}