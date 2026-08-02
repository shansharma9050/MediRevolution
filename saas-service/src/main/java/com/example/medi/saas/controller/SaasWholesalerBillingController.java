package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasSaleRequest;
import com.example.medi.saas.dto.SaasSaleResponse;
import com.example.medi.saas.dto.SaasSalesSummaryResponse;
import com.example.medi.saas.service.SaasWholesalerBillingService;
import com.example.medi.saas.service.SaasWholesalerInvoicePdfService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/saas/wholesaler/billing")
public class SaasWholesalerBillingController {

    private final SaasWholesalerBillingService billingService;
    private final SaasWholesalerInvoicePdfService invoicePdfService;

    public SaasWholesalerBillingController(
            SaasWholesalerBillingService billingService, SaasWholesalerInvoicePdfService invoicePdfService
    ) {
        this.billingService = billingService;
        this.invoicePdfService=invoicePdfService;
    }

    /**
     * Create Sale
     */
    @PostMapping("/sales")
    public SaasSaleResponse createSale(
            @RequestBody SaasSaleRequest request
    ) {
        return billingService.createSale(request);
    }

    /**
     * Update Sale
     */
    @PutMapping("/sales/{saleId}")
    public SaasSaleResponse updateSale(
            @PathVariable Long saleId,
            @RequestBody SaasSaleRequest request
    ) {
        return billingService.updateSale(saleId, request);
    }

    /**
     * Cancel Sale
     */
    @DeleteMapping("/sales/{saleId}")
    public void cancelSale(
            @PathVariable Long saleId,
            @RequestParam Long tenantId
    ) {
        billingService.cancelSale(
                tenantId,
                saleId
        );
    }

    /**
     * Get All Sales
     */
    @GetMapping("/sales")
    public List<SaasSaleResponse> getAllSales(
            @RequestParam Long tenantId
    ) {
        return billingService.getAllSales(
                tenantId
        );
    }

    /**
     * Search Sales
     */
    @GetMapping("/sales/search")
    public List<SaasSaleResponse> searchSales(
            @RequestParam Long tenantId,
            @RequestParam String keyword
    ) {
        return billingService.searchSales(
                tenantId,
                keyword
        );
    }

    /**
     * Get Sale By Id
     */
    @GetMapping("/sales/{saleId}")
    public SaasSaleResponse getSaleById(
            @PathVariable Long saleId,
            @RequestParam Long tenantId
    ) {
        return billingService.getSaleById(
                tenantId,
                saleId
        );
    }

    /**
     * Get Customer Sales
     */
    @GetMapping("/customers/{customerId}/sales")
    public List<SaasSaleResponse> getSalesByCustomer(
            @PathVariable Long customerId,
            @RequestParam Long tenantId
    ) {
        return billingService.getSalesByCustomer(
                tenantId,
                customerId
        );
    }

    /**
     * Dashboard Summary
     */
    @GetMapping("/sales/summary")
    public SaasSalesSummaryResponse getSummary(
            @RequestParam Long tenantId
    ) {
        return billingService.getSalesSummary(
                tenantId
        );
    }

    /**
     * Available Stock
     */
    @GetMapping("/stock")
    public Long getAvailableStock(
            @RequestParam Long tenantId,
            @RequestParam Long medicineId
    ) {
        return billingService.getAvailableStock(
                tenantId,
                medicineId
        );
    }

    /**
     * Validate Stock
     */
    @GetMapping("/stock/check")
    public boolean hasSufficientStock(
            @RequestParam Long tenantId,
            @RequestParam Long medicineId,
            @RequestParam Integer quantity
    ) {
        return billingService.hasSufficientStock(
                tenantId,
                medicineId,
                quantity
        );
    }

    /**
     * Calculate Sale Total
     */
    @PostMapping("/sales/calculate")
    public BigDecimal calculateSaleTotal(
            @RequestBody SaasSaleRequest request
    ) {
        return billingService.calculateSaleTotal(
                request
        );
    }
    
    @GetMapping("/invoice/{saleId}/pdf")
    public ResponseEntity<byte[]> printInvoice(
            @PathVariable Long saleId,
            @RequestParam Long tenantId
    ) {

        byte[] pdf =
                invoicePdfService.generateInvoicePdf(
                        tenantId,
                        saleId
                );

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=Invoice-" + saleId + ".pdf"
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);

    }

}