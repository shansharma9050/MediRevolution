package com.example.medi.medicine.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.medicine.dto.WholesalerMedicineDashboardResponse;
import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.entity.WholesalerMedicineStock;
import com.example.medi.medicine.repository.MedicineRepository;
import com.example.medi.medicine.repository.WholesalerMedicineStockRepository;
import com.example.medi.medicine.security.CurrentUserUtil;

import java.util.List;

@Service
public class StockService {

    private final WholesalerMedicineStockRepository stockRepository;
    private final MedicineRepository medicineRepository;

    public StockService(
            WholesalerMedicineStockRepository stockRepository,
            MedicineRepository medicineRepository
    ) {
        this.stockRepository = stockRepository;
        this.medicineRepository = medicineRepository;
    }

    @CacheEvict(
            value = {
                    "myStock",
                    "stockSearch",
                    "stockById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public WholesalerMedicineStock addStock(Long medicineId, WholesalerMedicineStock stock) {

        if (!CurrentUserUtil.getRole().equals("WHOLESALER")) {
            throw new AccessDeniedException("Only WHOLESALER can add stock");
        }

        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        stock.setMedicine(medicine);
        stock.setWholesalerAuthUserId(CurrentUserUtil.getUserId());

        return stockRepository.save(stock);
    }

    @Cacheable(
            value = "myStock",
            key = "T(com.example.medi.medicine.security.CurrentUserUtil).getUserId()"
    )
    public List<WholesalerMedicineStock> getMyStock() {

        if (!CurrentUserUtil.getRole().equals("WHOLESALER")) {
            throw new AccessDeniedException("Only WHOLESALER can view own stock");
        }

        System.out.println("DB HIT: Loading wholesaler stock userId = " + CurrentUserUtil.getUserId());

        return stockRepository.findByWholesalerAuthUserId(CurrentUserUtil.getUserId());
    }

    @Cacheable(value = "stockSearch", key = "#keyword")
    public List<WholesalerMedicineStock> searchStockForRetailer(String keyword) {

        if (!CurrentUserUtil.getRole().equals("RETAILER")) {
            throw new AccessDeniedException("Only RETAILER can search wholesaler stock");
        }

        System.out.println("DB HIT: Searching stock keyword = " + keyword);

        return stockRepository
                .findByMedicine_MedicineNameContainingIgnoreCaseOrMedicine_BrandNameContainingIgnoreCase(
                        keyword,
                        keyword
                );
    }

    @Cacheable(value = "stockById", key = "#stockId")
    public WholesalerMedicineStock getStockById(Long stockId) {
        System.out.println("DB HIT: Loading stock id = " + stockId);

        return stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock not found"));
    }

    @CacheEvict(
            value = {
                    "myStock",
                    "stockSearch",
                    "stockById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public WholesalerMedicineStock reduceStock(Long stockId, Integer quantity) {

        WholesalerMedicineStock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock not found"));

        if (quantity == null || quantity <= 0) {
            throw new RuntimeException("Quantity must be greater than zero");
        }

        if (stock.getAvailableQuantity() == null || stock.getAvailableQuantity() < quantity) {
            throw new RuntimeException("Insufficient stock available");
        }

        stock.setAvailableQuantity(stock.getAvailableQuantity() - quantity);

        return stockRepository.save(stock);
    }

    @Cacheable(
            value = "wholesalerDashboard",
            key = "T(com.example.medi.medicine.security.CurrentUserUtil).getUserId()"
    )
    public WholesalerMedicineDashboardResponse getWholesalerDashboardCounts() {

        if (!CurrentUserUtil.getRole().equals("WHOLESALER")) {
            throw new AccessDeniedException("Only WHOLESALER can view inventory dashboard");
        }

        Long wholesalerId = CurrentUserUtil.getUserId();

        System.out.println("DB HIT: Loading wholesaler medicine dashboard userId = " + wholesalerId);

        List<WholesalerMedicineStock> stocks =
                stockRepository.findByWholesalerAuthUserId(wholesalerId);

        long totalQuantity = stocks.stream()
                .mapToLong(stock -> stock.getAvailableQuantity() == null ? 0 : stock.getAvailableQuantity())
                .sum();

        long lowStockItems = stocks.stream()
                .filter(stock ->
                        stock.getAvailableQuantity() != null &&
                        stock.getMinimumStockLevel() != null &&
                        stock.getAvailableQuantity() <= stock.getMinimumStockLevel()
                )
                .count();

        return new WholesalerMedicineDashboardResponse(
                medicineRepository.count(),
                stocks.size(),
                totalQuantity,
                lowStockItems
        );
    }
}