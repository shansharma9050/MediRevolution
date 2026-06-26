package com.example.medi.medicine.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.medicine.client.UserServiceClient;
import com.example.medi.medicine.dto.SubscriptionCheckResponse;
import com.example.medi.medicine.dto.WholesalerMedicineDashboardResponse;
import com.example.medi.medicine.dto.WholesalerProfileResponse;
import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.entity.WholesalerMedicineStock;
import com.example.medi.medicine.repository.MedicineRepository;
import com.example.medi.medicine.repository.WholesalerMedicineStockRepository;
import com.example.medi.medicine.security.CurrentUserUtil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StockService {

    private final WholesalerMedicineStockRepository stockRepository;
    private final MedicineRepository medicineRepository;
    private final UserServiceClient userServiceClient;
    private final CurrentUserUtil currentUserUtil;

    public StockService(
            WholesalerMedicineStockRepository stockRepository,
            MedicineRepository medicineRepository,
            UserServiceClient userServiceClient,
            CurrentUserUtil currentUserUtil
    ) {
        this.stockRepository = stockRepository;
        this.medicineRepository = medicineRepository;
        this.userServiceClient = userServiceClient;
        this.currentUserUtil = currentUserUtil;
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

    public List<WholesalerMedicineStock> getMyStock() {

        if (!CurrentUserUtil.getRole().equals("WHOLESALER")) {
            throw new AccessDeniedException("Only WHOLESALER can view own stock");
        }

        System.out.println("DB HIT: Loading wholesaler stock userId = " + CurrentUserUtil.getUserId());

        return stockRepository.findByWholesalerAuthUserId(CurrentUserUtil.getUserId());
    }

    /*
     * Retailer search medicine stock.
     * This is the method used by:
     * GET /medicines/stock/search?keyword=para
     */
    public List<WholesalerMedicineStock> searchStockForRetailer(String keyword) {

        if (!CurrentUserUtil.getRole().equals("RETAILER")) {
            throw new AccessDeniedException("Only RETAILER can search wholesaler stock");
        }

        if (keyword == null || keyword.isBlank()) {
            throw new RuntimeException("Search keyword is required");
        }

        System.out.println("DB HIT: Searching stock keyword = " + keyword);

        List<WholesalerMedicineStock> stocks = stockRepository
                .findByMedicine_MedicineNameContainingIgnoreCaseOrMedicine_BrandNameContainingIgnoreCase(
                        keyword,
                        keyword
                );

        attachWholesalerProfileDetails(stocks);

        return stocks;
    }

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

    private void attachWholesalerProfileDetails(List<WholesalerMedicineStock> stocks) {

        if (stocks == null || stocks.isEmpty()) {
            return;
        }

        String authorization = currentUserUtil.getAuthorizationHeader();

        System.out.println("Forwarded Authorization to user-service: " + authorization);

        Map<Long, WholesalerProfileResponse> profileCache = new HashMap<>();

        for (WholesalerMedicineStock stock : stocks) {

            Long wholesalerAuthUserId = stock.getWholesalerAuthUserId();

            System.out.println("Stock ID: " + stock.getId());
            System.out.println("Wholesaler Auth User ID: " + wholesalerAuthUserId);

            if (wholesalerAuthUserId == null) {
                stock.setWholesalerName("-");
                stock.setWholesalerCompanyName("-");
                stock.setWholesalerMobile("-");
                stock.setWholesalerAddress("-");
                continue;
            }

            try {
                WholesalerProfileResponse profile = profileCache.get(wholesalerAuthUserId);

                if (profile == null) {
                    profile = userServiceClient.getWholesalerProfileByAuthUserId(
                            wholesalerAuthUserId,
                            authorization
                    );

                    profileCache.put(wholesalerAuthUserId, profile);
                }

                String companyName = getBestWholesalerName(profile, wholesalerAuthUserId);

                System.out.println("Wholesaler profile fetched successfully");
                System.out.println("Company Name: " + companyName);

                stock.setWholesalerName(companyName);
                stock.setWholesalerCompanyName(companyName);
                stock.setWholesalerMobile(profile == null ? "-" : safeValue(profile.getMobile()));
                stock.setWholesalerAddress(buildAddress(profile));

            } catch (Exception e) {
                System.out.println("Unable to fetch wholesaler profile for authUserId: " + wholesalerAuthUserId);
                System.out.println("Reason: " + e.getMessage());

                stock.setWholesalerName("-");
                stock.setWholesalerCompanyName("-");
                stock.setWholesalerMobile("-");
                stock.setWholesalerAddress("-");
            }
        }
    }

    private String getBestWholesalerName(
            WholesalerProfileResponse profile,
            Long wholesalerAuthUserId
    ) {
        if (profile == null) {
            return "Wholesaler ID: " + wholesalerAuthUserId;
        }

        if (profile.getCompanyName() != null && !profile.getCompanyName().isBlank()) {
            return profile.getCompanyName();
        }

        if (profile.getBusinessName() != null && !profile.getBusinessName().isBlank()) {
            return profile.getBusinessName();
        }

        if (profile.getContactPersonName() != null && !profile.getContactPersonName().isBlank()) {
            return profile.getContactPersonName();
        }

        return "Wholesaler ID: " + wholesalerAuthUserId;
    }

    private String buildAddress(WholesalerProfileResponse profile) {

        if (profile == null) {
            return "-";
        }

        StringBuilder address = new StringBuilder();

        if (profile.getAddress() != null && !profile.getAddress().isBlank()) {
            address.append(profile.getAddress());
        }

        if (profile.getDistrict() != null && !profile.getDistrict().isBlank()) {
            if (address.length() > 0) {
                address.append(", ");
            }
            address.append(profile.getDistrict());
        }

        if (profile.getState() != null && !profile.getState().isBlank()) {
            if (address.length() > 0) {
                address.append(", ");
            }
            address.append(profile.getState());
        }

        return address.length() == 0 ? "-" : address.toString();
    }

    private String safeValue(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}