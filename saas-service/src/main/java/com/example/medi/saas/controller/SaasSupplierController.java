package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasSupplierRequest;
import com.example.medi.saas.dto.SaasSupplierResponse;
import com.example.medi.saas.service.SaasSupplierService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/suppliers")
public class SaasSupplierController {

    private final SaasSupplierService supplierService;

    public SaasSupplierController(
            SaasSupplierService supplierService
    ) {
        this.supplierService = supplierService;
    }

    @GetMapping
    public List<SaasSupplierResponse> getSuppliers(
            @RequestParam Long tenantId,

            @RequestParam(
                    required = false,
                    defaultValue = "false"
            )
            Boolean activeOnly
    ) {

        return supplierService.getSuppliers(
                tenantId,
                activeOnly
        );
    }

    @GetMapping("/search")
    public List<SaasSupplierResponse> searchSuppliers(
            @RequestParam Long tenantId,
            @RequestParam String keyword
    ) {

        return supplierService.searchSuppliers(
                tenantId,
                keyword
        );
    }

    @GetMapping("/{supplierId}")
    public SaasSupplierResponse getSupplier(
            @PathVariable Long supplierId,
            @RequestParam Long tenantId
    ) {

        return supplierService.getSupplier(
                tenantId,
                supplierId
        );
    }

    @PostMapping
    public SaasSupplierResponse createSupplier(
            @RequestBody
            SaasSupplierRequest request
    ) {

        return supplierService.createSupplier(
                request
        );
    }

    @PutMapping("/{supplierId}")
    public SaasSupplierResponse updateSupplier(
            @PathVariable Long supplierId,

            @RequestParam Long tenantId,

            @RequestBody
            SaasSupplierRequest request
    ) {

        return supplierService.updateSupplier(
                tenantId,
                supplierId,
                request
        );
    }

    @DeleteMapping("/{supplierId}")
    public SaasSupplierResponse deactivateSupplier(
            @PathVariable Long supplierId,
            @RequestParam Long tenantId
    ) {

        return supplierService.deactivateSupplier(
                tenantId,
                supplierId
        );
    }

    @PatchMapping("/{supplierId}/activate")
    public SaasSupplierResponse activateSupplier(
            @PathVariable Long supplierId,
            @RequestParam Long tenantId
    ) {

        return supplierService.activateSupplier(
                tenantId,
                supplierId
        );
    }
}