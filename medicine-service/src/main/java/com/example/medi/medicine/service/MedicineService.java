package com.example.medi.medicine.service;

import com.example.medi.medicine.client.BillingClient;
import com.example.medi.medicine.dto.MedicineRequest;
import com.example.medi.medicine.dto.MedicineResponse;
import com.example.medi.medicine.dto.SubscriptionCheckResponse;
import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.repository.MedicineRepository;
import com.example.medi.medicine.security.CurrentUserUtil;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final BillingClient billingClient;
    private final CurrentUserUtil currentUserUtil;

    public MedicineService(
            MedicineRepository medicineRepository,
            BillingClient billingClient,
            CurrentUserUtil currentUserUtil
    ) {
        this.medicineRepository = medicineRepository;
        this.billingClient = billingClient;
        this.currentUserUtil = currentUserUtil;
    }

    /*
     * Existing non-SaaS Medicine Master create flow.
     */
    @Transactional
    @CacheEvict(
            value = {
                    "medicines",
                    "medicineSearch",
                    "medicineById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public MedicineResponse addMedicine(
            MedicineRequest request
    ) {

        String role = normalizeRole(
                CurrentUserUtil.getRole()
        );

        if (!"SUPER_ADMIN".equals(role)
                && !"WHOLESALER".equals(role)) {

            throw new AccessDeniedException(
                    "Only SUPER_ADMIN or WHOLESALER can add medicine master data"
            );
        }

        /*
         * Subscription check is only for non-SaaS WHOLESALER.
         * SUPER_ADMIN ke liye subscription validation nahi chalegi.
         */
        if ("WHOLESALER".equals(role)) {

            Long wholesalerAuthUserId =
                    CurrentUserUtil.getUserId();

            validateWholesalerSubscription(
                    wholesalerAuthUserId
            );
        }

        Medicine medicine =
                createMedicineEntity(request);

        return toResponse(
                medicineRepository.save(medicine)
        );
    }

    /*
     * Internal SaaS create flow.
     * Permission validation SaaS service me already hoti hai.
     */
    @Transactional
    @CacheEvict(
            value = {
                    "medicines",
                    "medicineSearch",
                    "medicineById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public MedicineResponse createMedicineForSaas(
            MedicineRequest request
    ) {

        Medicine medicine =
                createMedicineEntity(request);

        return toResponse(
                medicineRepository.save(medicine)
        );
    }

    @Transactional
    @CacheEvict(
            value = {
                    "medicines",
                    "medicineSearch",
                    "medicineById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public MedicineResponse updateMedicineForSaas(
            Long medicineId,
            MedicineRequest request
    ) {

        if (medicineId == null) {
            throw new RuntimeException(
                    "Medicine id is required"
            );
        }

        validateRequest(request);

        Medicine medicine =
                medicineRepository.findById(medicineId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Medicine not found"
                                )
                        );

        String medicineName =
                normalizeRequiredText(
                        request.getMedicineName(),
                        "Medicine name"
                );

        String brandName =
                normalizeRequiredText(
                        request.getBrandName(),
                        "Brand name"
                );

        String manufacturer =
                normalizeRequiredText(
                        request.getManufacturer(),
                        "Manufacturer"
                );

        medicineRepository
                .findByMedicineNameIgnoreCaseAndBrandNameIgnoreCaseAndManufacturerIgnoreCaseAndIdNot(
                        medicineName,
                        brandName,
                        manufacturer,
                        medicineId
                )
                .ifPresent(
                        duplicate -> {
                            throw new RuntimeException(
                                    "Medicine already exists with the same name, brand and manufacturer"
                            );
                        }
                );

        applyRequest(
                medicine,
                request
        );

        return toResponse(
                medicineRepository.save(medicine)
        );
    }

    @Transactional
    @CacheEvict(
            value = {
                    "medicines",
                    "medicineSearch",
                    "medicineById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public MedicineResponse deactivateMedicineForSaas(
            Long medicineId
    ) {

        Medicine medicine =
                medicineRepository.findById(medicineId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Medicine not found"
                                )
                        );

        medicine.setActive(false);

        return toResponse(
                medicineRepository.save(medicine)
        );
    }

    @Transactional
    @CacheEvict(
            value = {
                    "medicines",
                    "medicineSearch",
                    "medicineById",
                    "wholesalerDashboard"
            },
            allEntries = true
    )
    public MedicineResponse activateMedicineForSaas(
            Long medicineId
    ) {

        Medicine medicine =
                medicineRepository.findById(medicineId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Medicine not found"
                                )
                        );

        medicine.setActive(true);

        return toResponse(
                medicineRepository.save(medicine)
        );
    }

    @Cacheable(
            value = "medicineSearch",
            key = "#keyword == null ? '' : #keyword.toLowerCase()"
    )
    public List<MedicineResponse> searchMedicine(
            String keyword
    ) {

        String normalizedKeyword =
                normalizeOptionalText(keyword);

        if (normalizedKeyword == null) {
            return getAllMedicines();
        }

        return medicineRepository
                .searchMedicineMaster(
                        normalizedKeyword
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Cacheable(value = "medicines")
    public List<MedicineResponse> getAllMedicines() {

        return medicineRepository
                .findAllByOrderByMedicineNameAscBrandNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Cacheable(
            value = "medicineById",
            key = "#id"
    )
    public MedicineResponse getMedicineById(
            Long id
    ) {

        Medicine medicine =
                medicineRepository.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Medicine not found"
                                )
                        );

        return toResponse(medicine);
    }

    private Medicine createMedicineEntity(
            MedicineRequest request
    ) {

        validateRequest(request);

        String medicineName =
                normalizeRequiredText(
                        request.getMedicineName(),
                        "Medicine name"
                );

        String brandName =
                normalizeRequiredText(
                        request.getBrandName(),
                        "Brand name"
                );

        String manufacturer =
                normalizeRequiredText(
                        request.getManufacturer(),
                        "Manufacturer"
                );

        medicineRepository
                .findByMedicineNameIgnoreCaseAndBrandNameIgnoreCaseAndManufacturerIgnoreCase(
                        medicineName,
                        brandName,
                        manufacturer
                )
                .ifPresent(
                        duplicate -> {
                            throw new RuntimeException(
                                    "Medicine already exists with the same name, brand and manufacturer"
                            );
                        }
                );

        Medicine medicine =
                new Medicine();

        applyRequest(
                medicine,
                request
        );

        medicine.setActive(true);

        return medicine;
    }

    private void applyRequest(
            Medicine medicine,
            MedicineRequest request
    ) {

        medicine.setMedicineName(
                normalizeRequiredText(
                        request.getMedicineName(),
                        "Medicine name"
                )
        );

        medicine.setBrandName(
                normalizeRequiredText(
                        request.getBrandName(),
                        "Brand name"
                )
        );

        medicine.setComposition(
                normalizeRequiredText(
                        request.getComposition(),
                        "Composition"
                )
        );

        medicine.setManufacturer(
                normalizeRequiredText(
                        request.getManufacturer(),
                        "Manufacturer"
                )
        );

        medicine.setCategory(
                normalizeRequiredText(
                        request.getCategory(),
                        "Category"
                )
        );

        medicine.setMedicineType(
                normalizeRequiredText(
                        request.getMedicineType(),
                        "Medicine type"
                )
        );

        medicine.setDescription(
                normalizeOptionalText(
                        request.getDescription()
                )
        );

        medicine.setImageUrl(
                normalizeOptionalText(
                        request.getImageUrl()
                )
        );
    }

    private void validateRequest(
            MedicineRequest request
    ) {

        if (request == null) {
            throw new RuntimeException(
                    "Medicine request is required"
            );
        }

        normalizeRequiredText(
                request.getMedicineName(),
                "Medicine name"
        );

        normalizeRequiredText(
                request.getBrandName(),
                "Brand name"
        );

        normalizeRequiredText(
                request.getComposition(),
                "Composition"
        );

        normalizeRequiredText(
                request.getManufacturer(),
                "Manufacturer"
        );

        normalizeRequiredText(
                request.getCategory(),
                "Category"
        );

        normalizeRequiredText(
                request.getMedicineType(),
                "Medicine type"
        );
    }

    private String normalizeRequiredText(
            String value,
            String fieldName
    ) {

        String normalized =
                normalizeOptionalText(value);

        if (normalized == null) {
            throw new RuntimeException(
                    fieldName + " is required"
            );
        }

        return normalized;
    }

    private String normalizeOptionalText(
            String value
    ) {

        if (value == null) {
            return null;
        }

        String normalized =
                value.trim()
                        .replaceAll("\\s+", " ");

        return normalized.isBlank()
                ? null
                : normalized;
    }

    private String normalizeRole(
            String role
    ) {

        return role == null
                ? ""
                : role.trim()
                        .toUpperCase(Locale.ROOT);
    }

    private MedicineResponse toResponse(
            Medicine medicine
    ) {

        return new MedicineResponse(
                medicine.getId(),
                medicine.getMedicineName(),
                medicine.getBrandName(),
                medicine.getComposition(),
                medicine.getManufacturer(),
                medicine.getCategory(),
                medicine.getMedicineType(),
                medicine.getDescription(),
                medicine.getImageUrl(),
                medicine.isActive(),
                medicine.getCreatedAt()
        );
    }

    private void validateWholesalerSubscription(
            Long wholesalerAuthUserId
    ) {

        SubscriptionCheckResponse subscription =
                billingClient.checkSubscription(
                        wholesalerAuthUserId
                );

        if (subscription == null
                || !subscription.isActive()) {

            throw new RuntimeException(
                    "Wholesaler subscription is not active. Please activate a plan."
            );
        }
    }
}