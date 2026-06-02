package com.example.medi.frontend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String loginPage() {
        return "auth/login";
    }

    @GetMapping("/register")
    public String registerPage() {
        return "auth/register";
    }

    @GetMapping("/dashboard")
    public String dashboardPage() {
        return "dashboard";
    }
    @GetMapping("/approvals")
    public String adminApprovalsPage() {
        return "admin/approvals";
    }
   
    @GetMapping("/wholesaler/medicines")
    public String wholesalerMedicinePage() {
        return "wholesaler/medicines";
    }
    
    @GetMapping("/wholesaler/inventory")
    public String wholesalerInventoryPage() {
        return "wholesaler/inventory";
    }
    
    @GetMapping("/retailer/search-medicines")
    public String retailerSearchMedicinesPage() {
        return "retailer/search-medicines";
    }
    
    @GetMapping("/retailer/cart")
    public String retailerCartPage() {
        return "retailer/cart";
    }
    
    @GetMapping("/orders")
    public String ordersPage() {
        return "orders/orders";
    }
    
    @GetMapping("/invoices")
    public String invoicesPage() {
        return "invoice/invoices";
    }
    
    @GetMapping("/notifications")
    public String notificationsPage() {
        return "notification/notifications";
    }
}