package com.example.medi.frontend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SaasBusinessPageController {

    @GetMapping("/saas/suppliers")
    public String saasSuppliersPage() {
        return "saas-suppliers";
    }

    @GetMapping("/saas/customers")
    public String saasCustomersPage() {
        return "saas-customers";
    }

    @GetMapping("/saas/purchases")
    public String saasPurchasesPage() {
        return "saas-purchases";
    }

    @GetMapping("/saas/inventory")
    public String saasInventoryPage() {
        return "saas-inventory";
    }

    @GetMapping("/saas/sales")
    public String saasSalesPage() {
        return "saas-sales";
    }

    @GetMapping("/saas/sales-orders")
    public String saasSalesOrdersPage() {
        return "saas-sales-orders";
    }

    @GetMapping("/saas/purchase-returns")
    public String saasPurchaseReturnsPage() {
        return "saas-purchase-returns";
    }

    @GetMapping("/saas/sales-returns")
    public String saasSalesReturnsPage() {
        return "saas-sales-returns";
    }
    
    @GetMapping("/saas/payments")
    public String saasPaymentsPage() {
        return "saas-payments";
    }
    
    @GetMapping("/saas/expiry-management")
    public String saasExpiryManagementPage() {
        return "saas-expiry-management";
    }
}