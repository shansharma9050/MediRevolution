package com.example.medi.medicine.controller;

import com.example.medi.medicine.dto.MedicineRequest;
import com.example.medi.medicine.dto.MedicineResponse;
import com.example.medi.medicine.service.MedicineService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medicines")
public class MedicineController {

    private final MedicineService medicineService;

    public MedicineController(
            MedicineService medicineService
    ) {
        this.medicineService = medicineService;
    }

    @PostMapping
    public MedicineResponse addMedicine(
            @RequestBody MedicineRequest request
    ) {
        return medicineService.addMedicine(request);
    }

    @GetMapping
    public List<MedicineResponse> getAllMedicines() {
        return medicineService.getAllMedicines();
    }

    @GetMapping("/search")
    public List<MedicineResponse> searchMedicine(
            @RequestParam String keyword
    ) {
        return medicineService.searchMedicine(keyword);
    }

    @GetMapping("/{id}")
    public MedicineResponse getMedicineById(
            @PathVariable Long id
    ) {
        return medicineService.getMedicineById(id);
    }
}