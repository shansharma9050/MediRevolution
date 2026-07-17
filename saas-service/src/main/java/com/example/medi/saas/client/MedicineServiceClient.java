package com.example.medi.saas.client;

import com.example.medi.saas.dto.GlobalMedicineRequest;
import com.example.medi.saas.dto.GlobalMedicineResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "medicine-service")
public interface MedicineServiceClient {

    @GetMapping("/medicines/internal/saas")
    List<GlobalMedicineResponse> getAllMedicines(
            @RequestHeader("Authorization")
            String authorization,

            @RequestHeader("X-Internal-Service-Key")
            String internalServiceKey
    );

    @GetMapping("/medicines/internal/saas/search")
    List<GlobalMedicineResponse> searchMedicines(
            @RequestHeader("Authorization")
            String authorization,

            @RequestHeader("X-Internal-Service-Key")
            String internalServiceKey,

            @RequestParam("keyword")
            String keyword
    );

    @GetMapping("/medicines/internal/saas/{medicineId}")
    GlobalMedicineResponse getMedicine(
            @RequestHeader("Authorization")
            String authorization,

            @RequestHeader("X-Internal-Service-Key")
            String internalServiceKey,

            @PathVariable("medicineId")
            Long medicineId
    );

    @PostMapping("/medicines/internal/saas")
    GlobalMedicineResponse createMedicine(
            @RequestHeader("Authorization")
            String authorization,

            @RequestHeader("X-Internal-Service-Key")
            String internalServiceKey,

            @RequestBody
            GlobalMedicineRequest request
    );

    @PutMapping("/medicines/internal/saas/{medicineId}")
    GlobalMedicineResponse updateMedicine(
            @RequestHeader("Authorization")
            String authorization,

            @RequestHeader("X-Internal-Service-Key")
            String internalServiceKey,

            @PathVariable("medicineId")
            Long medicineId,

            @RequestBody
            GlobalMedicineRequest request
    );

    @DeleteMapping("/medicines/internal/saas/{medicineId}")
    GlobalMedicineResponse deactivateMedicine(
            @RequestHeader("Authorization")
            String authorization,

            @RequestHeader("X-Internal-Service-Key")
            String internalServiceKey,

            @PathVariable("medicineId")
            Long medicineId
    );

    @PatchMapping("/medicines/internal/saas/{medicineId}/activate")
    GlobalMedicineResponse activateMedicine(
            @RequestHeader("Authorization")
            String authorization,

            @RequestHeader("X-Internal-Service-Key")
            String internalServiceKey,

            @PathVariable("medicineId")
            Long medicineId
    );
}