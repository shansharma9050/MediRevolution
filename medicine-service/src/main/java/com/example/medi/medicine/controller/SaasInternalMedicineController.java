package com.example.medi.medicine.controller;

import com.example.medi.medicine.dto.MedicineRequest;
import com.example.medi.medicine.dto.MedicineResponse;
import com.example.medi.medicine.service.MedicineService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@RestController
@RequestMapping("/medicines/internal/saas")
public class SaasInternalMedicineController {

    private final MedicineService medicineService;
    private final String internalServiceKey;

    public SaasInternalMedicineController(
            MedicineService medicineService,
            @Value("${internal.service.key}")
            String internalServiceKey
    ) {
        this.medicineService = medicineService;
        this.internalServiceKey = internalServiceKey;
    }

    @GetMapping
    public List<MedicineResponse> getAllMedicines(
            @RequestHeader("X-Internal-Service-Key")
            String suppliedInternalKey
    ) {

        validateInternalKey(
                suppliedInternalKey
        );

        return medicineService.getAllMedicines();
    }

    @GetMapping("/search")
    public List<MedicineResponse> searchMedicines(
            @RequestHeader("X-Internal-Service-Key")
            String suppliedInternalKey,

            @RequestParam String keyword
    ) {

        validateInternalKey(
                suppliedInternalKey
        );

        return medicineService.searchMedicine(
                keyword
        );
    }

    @GetMapping("/{medicineId}")
    public MedicineResponse getMedicine(
            @RequestHeader("X-Internal-Service-Key")
            String suppliedInternalKey,

            @PathVariable Long medicineId
    ) {

        validateInternalKey(
                suppliedInternalKey
        );

        return medicineService.getMedicineById(
                medicineId
        );
    }

    @PostMapping
    public MedicineResponse createMedicine(
            @RequestHeader("X-Internal-Service-Key")
            String suppliedInternalKey,

            @RequestBody MedicineRequest request
    ) {

        validateInternalKey(
                suppliedInternalKey
        );

        return medicineService.createMedicineForSaas(
                request
        );
    }

    @PutMapping("/{medicineId}")
    public MedicineResponse updateMedicine(
            @RequestHeader("X-Internal-Service-Key")
            String suppliedInternalKey,

            @PathVariable Long medicineId,

            @RequestBody MedicineRequest request
    ) {

        validateInternalKey(
                suppliedInternalKey
        );

        return medicineService.updateMedicineForSaas(
                medicineId,
                request
        );
    }

    @DeleteMapping("/{medicineId}")
    public MedicineResponse deactivateMedicine(
            @RequestHeader("X-Internal-Service-Key")
            String suppliedInternalKey,

            @PathVariable Long medicineId
    ) {

        validateInternalKey(
                suppliedInternalKey
        );

        return medicineService.deactivateMedicineForSaas(
                medicineId
        );
    }

    @PatchMapping("/{medicineId}/activate")
    public MedicineResponse activateMedicine(
            @RequestHeader("X-Internal-Service-Key")
            String suppliedInternalKey,

            @PathVariable Long medicineId
    ) {

        validateInternalKey(
                suppliedInternalKey
        );

        return medicineService.activateMedicineForSaas(
                medicineId
        );
    }

    private void validateInternalKey(
            String suppliedInternalKey
    ) {

        if (suppliedInternalKey == null
                || suppliedInternalKey.isBlank()) {

            throw new SecurityException(
                    "Internal service key is required"
            );
        }

        boolean valid =
                MessageDigest.isEqual(
                        internalServiceKey.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        suppliedInternalKey.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

        if (!valid) {
            throw new SecurityException(
                    "Invalid internal service key"
            );
        }
    }
}