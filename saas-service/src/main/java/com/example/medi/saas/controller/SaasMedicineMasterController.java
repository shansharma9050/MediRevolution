package com.example.medi.saas.controller;

import com.example.medi.saas.dto.GlobalMedicineRequest;
import com.example.medi.saas.dto.GlobalMedicineResponse;
import com.example.medi.saas.service.SaasMedicineMasterService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/medicine-master")
public class SaasMedicineMasterController {

	private final SaasMedicineMasterService medicineMasterService;

	public SaasMedicineMasterController(SaasMedicineMasterService medicineMasterService) {
		this.medicineMasterService = medicineMasterService;
	}

	@GetMapping
	public List<GlobalMedicineResponse> getAllMedicines(@RequestParam Long tenantId,

			@RequestHeader("Authorization") String authorization) {

		return medicineMasterService.getAllMedicines(tenantId, authorization);
	}

	@GetMapping("/search")
	public List<GlobalMedicineResponse> searchMedicines(@RequestParam Long tenantId,

			@RequestParam String keyword,

			@RequestHeader("Authorization") String authorization) {

		return medicineMasterService.searchMedicines(tenantId, keyword, authorization);
	}

	@GetMapping("/{medicineId}")
	public GlobalMedicineResponse getMedicine(@PathVariable Long medicineId,

			@RequestParam Long tenantId,

			@RequestHeader("Authorization") String authorization) {

		return medicineMasterService.getMedicine(tenantId, medicineId, authorization);
	}

	@PostMapping
	public GlobalMedicineResponse createMedicine(@RequestParam Long tenantId,

			@RequestBody GlobalMedicineRequest request,

			@RequestHeader("Authorization") String authorization) {

		return medicineMasterService.createMedicine(tenantId, request, authorization);
	}

	@PutMapping("/{medicineId}")
	public GlobalMedicineResponse updateMedicine(@PathVariable Long medicineId,

			@RequestParam Long tenantId,

			@RequestBody GlobalMedicineRequest request,

			@RequestHeader("Authorization") String authorization) {

		return medicineMasterService.updateMedicine(tenantId, medicineId, request, authorization);
	}

	@DeleteMapping("/{medicineId}")
	public GlobalMedicineResponse deactivateMedicine(@PathVariable Long medicineId,

			@RequestParam Long tenantId,

			@RequestHeader("Authorization") String authorization) {

		return medicineMasterService.deactivateMedicine(tenantId, medicineId, authorization);
	}

	@PatchMapping("/{medicineId}/activate")
	public GlobalMedicineResponse activateMedicine(@PathVariable Long medicineId,

			@RequestParam Long tenantId,

			@RequestHeader("Authorization") String authorization) {

		return medicineMasterService.activateMedicine(tenantId, medicineId, authorization);
	}
}