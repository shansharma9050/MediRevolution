package com.example.medi.medicine.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.medicine.client.BillingClient;
import com.example.medi.medicine.dto.SubscriptionCheckResponse;
import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.repository.MedicineRepository;
import com.example.medi.medicine.security.CurrentUserUtil;

import java.util.List;

@Service
public class MedicineService {

	
    private final MedicineRepository medicineRepository;
    private final BillingClient billingClient; 
    private final CurrentUserUtil currentUserUtil;
    public MedicineService(MedicineRepository medicineRepository,BillingClient billingClient,CurrentUserUtil currentUserUtil) {
        this.medicineRepository = medicineRepository;
        this.billingClient=billingClient;
        this.currentUserUtil=currentUserUtil;
    }

    @CacheEvict(
            value = {
                    "medicines",
                    "medicineSearch",
                    "medicineById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public Medicine addMedicine(Medicine medicine) {
    	Long wholesalerAuthUserId = currentUserUtil.getUserId();
    	validateWholesalerSubscription(wholesalerAuthUserId);
    	
        String role = CurrentUserUtil.getRole();

        if (!role.equals("SUPER_ADMIN") && !role.equals("WHOLESALER")) {
            throw new AccessDeniedException("Only SUPER_ADMIN or WHOLESALER can add medicine master data");
        }

        return medicineRepository.save(medicine);
    }

    @Cacheable(value = "medicineSearch", key = "#keyword")
    public List<Medicine> searchMedicine(String keyword) {
        System.out.println("DB HIT: Searching medicine keyword = " + keyword);

        return medicineRepository
                .findByMedicineNameContainingIgnoreCaseOrBrandNameContainingIgnoreCase(keyword, keyword);
    }

    @Cacheable(value = "medicines")
    public List<Medicine> getAllMedicines() {
        System.out.println("DB HIT: Loading all medicines");

        return medicineRepository.findAll();
    }

    @Cacheable(value = "medicineById", key = "#id")
    public Medicine getMedicineById(Long id) {
        System.out.println("DB HIT: Loading medicine id = " + id);

        return medicineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
    }
    
    private void validateWholesalerSubscription(Long wholesalerAuthUserId) {
        SubscriptionCheckResponse subscription = billingClient.checkSubscription(wholesalerAuthUserId);

        if (subscription == null || !subscription.isActive()) {
            throw new RuntimeException("Wholesaler subscription is not active. Please activate a plan.");
        }
    }
}