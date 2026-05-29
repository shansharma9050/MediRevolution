package com.example.medi.medicine.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.medicine.entity.Medicine;

import java.util.List;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    List<Medicine> findByMedicineNameContainingIgnoreCaseOrBrandNameContainingIgnoreCase(
            String medicineName,
            String brandName
    );
}
