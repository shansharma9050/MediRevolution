package com.example.medi.medicine.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.medicine.entity.WholesalerMedicineStock;

import java.util.List;

public interface WholesalerMedicineStockRepository extends JpaRepository<WholesalerMedicineStock, Long> {

    List<WholesalerMedicineStock> findByWholesalerAuthUserId(Long wholesalerAuthUserId);

    List<WholesalerMedicineStock> findByMedicine_MedicineNameContainingIgnoreCaseOrMedicine_BrandNameContainingIgnoreCase(
            String medicineName,
            String brandName
    );
}
