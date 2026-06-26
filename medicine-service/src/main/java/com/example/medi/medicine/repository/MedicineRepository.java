package com.example.medi.medicine.repository;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.entity.WholesalerMedicineStock;

import feign.Param;

import java.util.List;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    List<Medicine> findByMedicineNameContainingIgnoreCaseOrBrandNameContainingIgnoreCase(
            String medicineName,
            String brandName
    );
    
    @Query("""
            SELECT s FROM WholesalerMedicineStock s
            JOIN s.medicine m
            WHERE s.active = true
              AND s.availableQuantity > 0
              AND (
                    LOWER(m.medicineName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(m.brandName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(m.composition) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            ORDER BY s.wholesalePrice ASC
            """)
    List<WholesalerMedicineStock> searchAvailableStock(@Param("keyword") String keyword);
}
