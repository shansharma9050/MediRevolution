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