package com.example.medi.medicine.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.repository.MedicineRepository;
import com.example.medi.medicine.security.CurrentUserUtil;

import java.util.List;

@Service
public class MedicineService {

    private final MedicineRepository medicineRepository;

    public MedicineService(MedicineRepository medicineRepository) {
        this.medicineRepository = medicineRepository;
    }

    public Medicine addMedicine(Medicine medicine) {

        String role = CurrentUserUtil.getRole();

        if (!role.equals("SUPER_ADMIN") && !role.equals("WHOLESALER")) {
            throw new AccessDeniedException("Only SUPER_ADMIN or WHOLESALER can add medicine master data");
        }

        return medicineRepository.save(medicine);
    }

    public List<Medicine> searchMedicine(String keyword) {
        return medicineRepository
                .findByMedicineNameContainingIgnoreCaseOrBrandNameContainingIgnoreCase(keyword, keyword);
    }

    public List<Medicine> getAllMedicines() {
        return medicineRepository.findAll();
    }

    public Medicine getMedicineById(Long id) {
        return medicineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
    }
}