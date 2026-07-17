package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasPurchaseReturnService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/purchase-returns")
public class SaasPurchaseReturnController {

    private final SaasPurchaseReturnService returnService;

    public SaasPurchaseReturnController(
            SaasPurchaseReturnService returnService
    ) {
        this.returnService = returnService;
    }

    @GetMapping
    public List<SaasPurchaseReturnResponse> getReturns(
            @RequestParam Long tenantId
    ) {

        return returnService.getReturns(
                tenantId
        );
    }

    @GetMapping("/search")
    public List<SaasPurchaseReturnResponse> searchReturns(
            @RequestParam Long tenantId,

            @RequestParam(required = false)
            String keyword
    ) {

        return returnService.searchReturns(
                tenantId,
                keyword
        );
    }

    @GetMapping("/summary")
    public SaasPurchaseReturnSummaryResponse getSummary(
            @RequestParam Long tenantId
    ) {

        return returnService.getSummary(
                tenantId
        );
    }

    @GetMapping("/{returnId}")
    public SaasPurchaseReturnResponse getReturn(
            @PathVariable Long returnId,

            @RequestParam Long tenantId
    ) {

        return returnService.getReturn(
                tenantId,
                returnId
        );
    }

    @GetMapping("/purchase/{purchaseId}/availability")
    public List<SaasPurchaseReturnAvailabilityResponse>
    getPurchaseReturnAvailability(
            @PathVariable Long purchaseId,

            @RequestParam Long tenantId
    ) {

        return returnService
                .getPurchaseReturnAvailability(
                        tenantId,
                        purchaseId
                );
    }

    @PostMapping
    public SaasPurchaseReturnResponse createReturn(
            @RequestBody
            SaasPurchaseReturnRequest request
    ) {

        return returnService.createReturn(
                request
        );
    }
}