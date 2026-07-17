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

	/*
	 * Doctor pages
	 */

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

	@GetMapping("/doctor/availability")
	public String doctorAvailabilityPage() {
		return "appointment/doctor-availability";
	}

	@GetMapping("/doctor/appointment-requests")
	public String doctorAppointmentRequestsPage() {
		return "appointment/doctor-appointment-requests";
	}

	/*
	 * Hospital pages
	 */

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

	@GetMapping("/hospital/doctor-availability")
	public String hospitalDoctorAvailabilityPage() {
		return "appointment/hospital-doctor-availability";
	}

	@GetMapping("/hospital/appointment-requests")
	public String hospitalDoctorAppointmentRequestsPage() {
		return "appointment/hospital-appointment-requests";
	}

	@GetMapping("/hospital/doctors")
	public String hospitalDoctorsPage() {
		return "hospital/doctors";
	}

	/*
	 * Appointment and patient pages
	 */

	@GetMapping("/appointments/book")
	public String appointmentBookingPage() {
		return "appointment/book-appointment";
	}

	@GetMapping("/appointments/my")
	public String myAppointmentsPage() {
		return "appointment/my-appointments";
	}

	@GetMapping("/patient/prescriptions")
	public String patientPrescriptionsPage() {
		return "patient-prescriptions";
	}

	/*
	 * Payment and subscription pages
	 */

	@GetMapping("/forgot-password")
	public String forgotPasswordPage() {
		return "forgot-password";
	}

	@GetMapping("/payment-success")
	public String paymentSuccessPage() {
		return "payment-success";
	}

	@GetMapping("/subscription/plans")
	public String subscriptionPlansPage() {
		return "subscription-plans";
	}

	@GetMapping("/subscription/current")
	public String subscriptionCurrentPage() {
		return "subscription-current";
	}

	@GetMapping("/subscription-payment-success")
	public String subscriptionPaymentSuccess() {
		return "subscription-payment-success";
	}

	/*
	 * SaaS pages
	 */

	@GetMapping("/saas/workspaces")
	public String saasWorkspacesPage() {
		return "saas-workspaces";
	}

	@GetMapping("/saas/dashboard")
	public String saasDashboardPage() {
		return "saas-dashboard";
	}

	@GetMapping("/saas/medicine-master")
	public String saasMedicineMasterPage() {
		return "saas-medicine-master";
	}

	@GetMapping("/saas/patients")
	public String saasPatientsPage() {
		return "saas-patients";
	}

	@GetMapping("/saas/staff")
	public String saasStaffPage() {
		return "saas-staff";
	}

	@GetMapping("/saas/doctors")
	public String saasDoctorsPage() {
		return "saas-doctors";
	}

	@GetMapping("/saas/appointments")
	public String saasAppointmentsPage() {
		return "saas-appointments";
	}

	@GetMapping("/saas/prescriptions")
	public String saasPrescriptionsPage() {
		return "saas-prescriptions";
	}

	@GetMapping("/saas/opd")
	public String saasOpdPage() {
		return "saas-opd";
	}

	@GetMapping("/saas/ipd")
	public String saasIpdPage() {
		return "saas-ipd";
	}

	@GetMapping("/saas/billing")
	public String saasBillingPage() {
		return "saas-billing";
	}

	@GetMapping("/saas/inventory")
	public String saasInventoryPage() {
		return "saas-inventory";
	}

	@GetMapping("/saas/pharmacy")
	public String saasPharmacyPage() {
		return "saas-pharmacy";
	}

	@GetMapping("/saas/lab")
	public String saasLabPage() {
		return "saas-lab";
	}

	@GetMapping("/saas/radiology")
	public String saasRadiologyPage() {
		return "saas-radiology";
	}

	@GetMapping("/saas/reports")
	public String saasReportsPage() {
		return "saas-reports";
	}

	@GetMapping("/saas/settings")
	public String saasSettingsPage() {
		return "saas-settings";
	}

	@GetMapping("/saas/notifications")
	public String saasNotificationsPage() {
		return "saas-notifications";
	}

	@GetMapping("/saas/permissions")
	public String saasPermissionsPage() {
		return "saas-permissions";
	}

	@GetMapping("/saas/doctor-availability")
	public String saasDoctorAvailabilityPage() {
		return "saas-doctor-availability";
	}

	@GetMapping("/module-selection")
	public String moduleSelection() {
		return "module-selection";
	}
}