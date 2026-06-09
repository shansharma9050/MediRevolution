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
    
    @GetMapping("/profile")
    public String profilePage() {
        return "profile/profile";
    }
    
    @GetMapping("/reports")
    public String reportsPage() {
        return "reports/reports";
    }

	/*===============================================For Doctor==========================================================*/    
    @GetMapping("/doctor/dashboard")
    public String doctorDashboardPage() {
        return "doctor/doctor-dashboard";
    }

    @GetMapping("/doctor/patients")
    public String doctorPatientsPage() {
        return "doctor/patients";
    }

    @GetMapping("/doctor/prescriptions")
    public String doctorPrescriptionsPage() {
        return "doctor/prescriptions";
    }

    @GetMapping("/doctor/appointments")
    public String doctorAppointmentsPage() {
        return "doctor/appointments";
    }

    @GetMapping("/doctor/reports")
    public String doctorReportsPage() {
        return "doctor/reports";
    }
    
    
	/*===============================================For Hospital==========================================================*/    
    
    @GetMapping("/hospital/dashboard")
    public String hospitalDashboard() {
        return "hospital/hospital-dashboard";
    }

    @GetMapping("/hospital/patients")
    public String hospitalPatients() {
        return "hospital/patients";
    }

    @GetMapping("/hospital/staff")
    public String hospitalStaff() {
        return "hospital/staff";
    }

    @GetMapping("/hospital/inventory")
    public String hospitalInventory() {
        return "hospital/inventory";
    }

    @GetMapping("/hospital/billing")
    public String hospitalBilling() {
        return "hospital/billing";
    }

    @GetMapping("/hospital/reports")
    public String hospitalReports() {
        return "hospital/reports";
    }
    
    @GetMapping("/doctor/availability")
    public String doctorAvailabilityPage() {
        return "appointment/doctor-availability";
    }

    @GetMapping("/doctor/appointment-requests")
    public String doctorAppointmentRequestsPage() {
        return "appointment/doctor-appointment-requests";
    }

    @GetMapping("/hospital/doctor-availability")
    public String hospitalDoctorAvailabilityPage() {
        return "appointment/hospital-doctor-availability";
    }

    @GetMapping("/hospital/appointment-requests")
    public String hospitalAppointmentRequestsPage() {
        return "appointment/hospital-appointment-requests";
    }

    @GetMapping("/appointments/book")
    public String appointmentBookingPage() {
        return "appointment/book-appointment";
    }

    @GetMapping("/appointments/my")
    public String myAppointmentsPage() {
        return "appointment/my-appointments";
    }
    
    @GetMapping("/hospital/doctors")
    public String hospitalDoctorsPage() {
        return "hospital/doctors";
    }
    
    @GetMapping("/forgot-password")
    public String forgotPasswordPage() {
        return "forgot-password";
    }
    
    @GetMapping("/patient/prescriptions")
    public String patientPrescriptionsPage() {
        return "patient-prescriptions";
    }

}