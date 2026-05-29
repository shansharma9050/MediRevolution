package com.example.medi.medicine.controller;
import org.springframework.web.bind.annotation.*;

import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.service.MedicineService;

import java.util.List;

@RestController
@RequestMapping("/medicines")
public class MedicineController {

    private final MedicineService medicineService;

    public MedicineController(MedicineService medicineService) {
        this.medicineService = medicineService;
    }

    @PostMapping
    public Medicine addMedicine(@RequestBody Medicine medicine) {
        return medicineService.addMedicine(medicine);
    }

    @GetMapping
    public List<Medicine> getAllMedicines() {
        return medicineService.getAllMedicines();
    }

    @GetMapping("/search")
    public List<Medicine> searchMedicine(@RequestParam String keyword) {
        return medicineService.searchMedicine(keyword);
    }

    @GetMapping("/{id}")
    public Medicine getMedicineById(@PathVariable Long id) {
        return medicineService.getMedicineById(id);
    }
}