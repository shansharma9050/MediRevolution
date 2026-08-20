package com.example.medi.saas.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasBedRepository;
import com.example.medi.saas.repository.SaasCustomerRepository;
import com.example.medi.saas.repository.SaasDiagnosticOrderItemRepository;
import com.example.medi.saas.repository.SaasDiagnosticOrderRepository;
import com.example.medi.saas.repository.SaasDiagnosticTestRepository;
import com.example.medi.saas.repository.SaasDoctorAvailabilityRepository;
import com.example.medi.saas.repository.SaasDoctorProfileRepository;
import com.example.medi.saas.repository.SaasDoctorScheduleRepository;
import com.example.medi.saas.repository.SaasExpiryActionRepository;
import com.example.medi.saas.repository.SaasExpiryConfigurationRepository;
import com.example.medi.saas.repository.SaasInvoiceItemRepository;
import com.example.medi.saas.repository.SaasInvoiceRepository;
import com.example.medi.saas.repository.SaasIpdAdmissionRepository;
import com.example.medi.saas.repository.SaasIpdChargeRepository;
import com.example.medi.saas.repository.SaasIpdDailyNoteRepository;
import com.example.medi.saas.repository.SaasMedicineRepository;
import com.example.medi.saas.repository.SaasMedicineStockRepository;
import com.example.medi.saas.repository.SaasNotificationRepository;
import com.example.medi.saas.repository.SaasOpdVisitRepository;
import com.example.medi.saas.repository.SaasPartyLedgerEntryRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasPaymentReceiptRepository;
import com.example.medi.saas.repository.SaasPaymentTransactionRepository;
import com.example.medi.saas.repository.SaasPharmacySaleItemRepository;
import com.example.medi.saas.repository.SaasPharmacySaleRepository;
import com.example.medi.saas.repository.SaasPrescriptionMedicineRepository;
import com.example.medi.saas.repository.SaasPrescriptionRepository;
import com.example.medi.saas.repository.SaasPurchaseItemRepository;
import com.example.medi.saas.repository.SaasPurchaseRepository;
import com.example.medi.saas.repository.SaasPurchaseReturnItemRepository;
import com.example.medi.saas.repository.SaasPurchaseReturnRepository;
import com.example.medi.saas.repository.SaasSaleItemRepository;
import com.example.medi.saas.repository.SaasSaleRepository;
import com.example.medi.saas.repository.SaasSaleStockAllocationRepository;
import com.example.medi.saas.repository.SaasSalesOrderItemRepository;
import com.example.medi.saas.repository.SaasSalesOrderRepository;
import com.example.medi.saas.repository.SaasSalesOrderTimelineRepository;
import com.example.medi.saas.repository.SaasSalesReturnItemRepository;
import com.example.medi.saas.repository.SaasSalesReturnRepository;
import com.example.medi.saas.repository.SaasStaffRepository;
import com.example.medi.saas.repository.SaasStockMovementRepository;
import com.example.medi.saas.repository.SaasSupplierRepository;
import com.example.medi.saas.repository.SaasTenantMemberPermissionRepository;
import com.example.medi.saas.repository.SaasTenantSettingRepository;
import com.example.medi.saas.repository.SaasWardRepository;
import com.example.medi.saas.repository.SaasWholesalerInvoiceItemRepository;
import com.example.medi.saas.repository.SaasWholesalerInvoiceRepository;
import com.example.medi.saas.repository.TenantMemberRepository;
import com.example.medi.saas.repository.TenantModuleSettingRepository;
import com.example.medi.saas.repository.TenantRepository;

@Service
public class SaasWorkspaceDeletionService {

    private final TenantRepository tenantRepository;
    private final TenantMemberRepository tenantMemberRepository;
    private final TenantModuleSettingRepository tenantModuleSettingRepository;

    private final SaasTenantMemberPermissionRepository tenantMemberPermissionRepository;
    private final SaasTenantSettingRepository tenantSettingRepository;

    private final SaasAppointmentRepository appointmentRepository;
    private final SaasPrescriptionMedicineRepository prescriptionMedicineRepository;
    private final SaasPrescriptionRepository prescriptionRepository;

    private final SaasIpdDailyNoteRepository ipdDailyNoteRepository;
    private final SaasIpdChargeRepository ipdChargeRepository;
    private final SaasIpdAdmissionRepository ipdAdmissionRepository;

    private final SaasOpdVisitRepository opdVisitRepository;

    private final SaasDiagnosticOrderItemRepository diagnosticOrderItemRepository;
    private final SaasDiagnosticOrderRepository diagnosticOrderRepository;
    private final SaasDiagnosticTestRepository diagnosticTestRepository;

    private final SaasPaymentReceiptRepository paymentReceiptRepository;
    private final SaasInvoiceItemRepository invoiceItemRepository;
    private final SaasInvoiceRepository invoiceRepository;

    private final SaasPharmacySaleItemRepository pharmacySaleItemRepository;
    private final SaasPharmacySaleRepository pharmacySaleRepository;

    private final SaasSalesReturnItemRepository salesReturnItemRepository;
    private final SaasSalesReturnRepository salesReturnRepository;

    private final SaasSaleStockAllocationRepository saleStockAllocationRepository;
    private final SaasSaleItemRepository saleItemRepository;
    private final SaasSaleRepository saleRepository;

    private final SaasSalesOrderTimelineRepository salesOrderTimelineRepository;
    private final SaasSalesOrderItemRepository salesOrderItemRepository;
    private final SaasSalesOrderRepository salesOrderRepository;

    private final SaasPurchaseReturnItemRepository purchaseReturnItemRepository;
    private final SaasPurchaseReturnRepository purchaseReturnRepository;

    private final SaasPurchaseItemRepository purchaseItemRepository;
    private final SaasPurchaseRepository purchaseRepository;

    private final SaasExpiryActionRepository expiryActionRepository;
    private final SaasStockMovementRepository stockMovementRepository;
    private final SaasMedicineStockRepository medicineStockRepository;
    private final SaasMedicineRepository medicineRepository;

    private final SaasPartyLedgerEntryRepository partyLedgerEntryRepository;
    private final SaasPaymentTransactionRepository paymentTransactionRepository;

    private final SaasCustomerRepository customerRepository;
    private final SaasSupplierRepository supplierRepository;

    private final SaasNotificationRepository notificationRepository;

    private final SaasWholesalerInvoiceItemRepository wholesalerInvoiceItemRepository;
    private final SaasWholesalerInvoiceRepository wholesalerInvoiceRepository;

    private final SaasDoctorAvailabilityRepository doctorAvailabilityRepository;
    private final SaasDoctorScheduleRepository doctorScheduleRepository;
    private final SaasDoctorProfileRepository doctorProfileRepository;

    private final SaasStaffRepository staffRepository;

    private final SaasBedRepository bedRepository;
    private final SaasWardRepository wardRepository;

    private final SaasPatientRepository patientRepository;

    public SaasWorkspaceDeletionService(
            TenantRepository tenantRepository,
            TenantMemberRepository tenantMemberRepository,
            TenantModuleSettingRepository tenantModuleSettingRepository,
            SaasTenantMemberPermissionRepository tenantMemberPermissionRepository,
            SaasTenantSettingRepository tenantSettingRepository,
            SaasAppointmentRepository appointmentRepository,
            SaasPrescriptionMedicineRepository prescriptionMedicineRepository,
            SaasPrescriptionRepository prescriptionRepository,
            SaasIpdDailyNoteRepository ipdDailyNoteRepository,
            SaasIpdChargeRepository ipdChargeRepository,
            SaasIpdAdmissionRepository ipdAdmissionRepository,
            SaasOpdVisitRepository opdVisitRepository,
            SaasDiagnosticOrderItemRepository diagnosticOrderItemRepository,
            SaasDiagnosticOrderRepository diagnosticOrderRepository,
            SaasDiagnosticTestRepository diagnosticTestRepository,
            SaasPaymentReceiptRepository paymentReceiptRepository,
            SaasInvoiceItemRepository invoiceItemRepository,
            SaasInvoiceRepository invoiceRepository,
            SaasPharmacySaleItemRepository pharmacySaleItemRepository,
            SaasPharmacySaleRepository pharmacySaleRepository,
            SaasSalesReturnItemRepository salesReturnItemRepository,
            SaasSalesReturnRepository salesReturnRepository,
            SaasSaleStockAllocationRepository saleStockAllocationRepository,
            SaasSaleItemRepository saleItemRepository,
            SaasSaleRepository saleRepository,
            SaasSalesOrderTimelineRepository salesOrderTimelineRepository,
            SaasSalesOrderItemRepository salesOrderItemRepository,
            SaasSalesOrderRepository salesOrderRepository,
            SaasPurchaseReturnItemRepository purchaseReturnItemRepository,
            SaasPurchaseReturnRepository purchaseReturnRepository,
            SaasPurchaseItemRepository purchaseItemRepository,
            SaasPurchaseRepository purchaseRepository,
            SaasExpiryActionRepository expiryActionRepository,
            SaasStockMovementRepository stockMovementRepository,
            SaasMedicineStockRepository medicineStockRepository,
            SaasMedicineRepository medicineRepository,
            SaasPartyLedgerEntryRepository partyLedgerEntryRepository,
            SaasPaymentTransactionRepository paymentTransactionRepository,
            SaasCustomerRepository customerRepository,
            SaasSupplierRepository supplierRepository,
            SaasNotificationRepository notificationRepository,
            SaasWholesalerInvoiceItemRepository wholesalerInvoiceItemRepository,
            SaasWholesalerInvoiceRepository wholesalerInvoiceRepository,
            SaasDoctorAvailabilityRepository doctorAvailabilityRepository,
            SaasDoctorScheduleRepository doctorScheduleRepository,
            SaasDoctorProfileRepository doctorProfileRepository,
            SaasStaffRepository staffRepository,
            SaasBedRepository bedRepository,
            SaasWardRepository wardRepository,
            SaasPatientRepository patientRepository) {

        this.tenantRepository = tenantRepository;
        this.tenantMemberRepository = tenantMemberRepository;
        this.tenantModuleSettingRepository = tenantModuleSettingRepository;
        this.tenantMemberPermissionRepository = tenantMemberPermissionRepository;
        this.tenantSettingRepository = tenantSettingRepository;

        this.appointmentRepository = appointmentRepository;
        this.prescriptionMedicineRepository = prescriptionMedicineRepository;
        this.prescriptionRepository = prescriptionRepository;

        this.ipdDailyNoteRepository = ipdDailyNoteRepository;
        this.ipdChargeRepository = ipdChargeRepository;
        this.ipdAdmissionRepository = ipdAdmissionRepository;

        this.opdVisitRepository = opdVisitRepository;

        this.diagnosticOrderItemRepository = diagnosticOrderItemRepository;
        this.diagnosticOrderRepository = diagnosticOrderRepository;
        this.diagnosticTestRepository = diagnosticTestRepository;

        this.paymentReceiptRepository = paymentReceiptRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.invoiceRepository = invoiceRepository;

        this.pharmacySaleItemRepository = pharmacySaleItemRepository;
        this.pharmacySaleRepository = pharmacySaleRepository;

        this.salesReturnItemRepository = salesReturnItemRepository;
        this.salesReturnRepository = salesReturnRepository;

        this.saleStockAllocationRepository = saleStockAllocationRepository;
        this.saleItemRepository = saleItemRepository;
        this.saleRepository = saleRepository;

        this.salesOrderTimelineRepository = salesOrderTimelineRepository;
        this.salesOrderItemRepository = salesOrderItemRepository;
        this.salesOrderRepository = salesOrderRepository;

        this.purchaseReturnItemRepository = purchaseReturnItemRepository;
        this.purchaseReturnRepository = purchaseReturnRepository;

        this.purchaseItemRepository = purchaseItemRepository;
        this.purchaseRepository = purchaseRepository;

        this.expiryActionRepository = expiryActionRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.medicineStockRepository = medicineStockRepository;
        this.medicineRepository = medicineRepository;

        this.partyLedgerEntryRepository = partyLedgerEntryRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;

        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;

        this.notificationRepository = notificationRepository;

        this.wholesalerInvoiceItemRepository = wholesalerInvoiceItemRepository;
        this.wholesalerInvoiceRepository = wholesalerInvoiceRepository;

        this.doctorAvailabilityRepository = doctorAvailabilityRepository;
        this.doctorScheduleRepository = doctorScheduleRepository;
        this.doctorProfileRepository = doctorProfileRepository;

        this.staffRepository = staffRepository;

        this.bedRepository = bedRepository;
        this.wardRepository = wardRepository;

        this.patientRepository = patientRepository;
    }

    /**
     * Permanently deletes one SaaS workspace and all tenant-owned SaaS data.
     *
     * IMPORTANT:
     * Billing-service subscription/payment cleanup is intentionally handled
     * outside this service because billing runs as a separate application.
     */
    @Transactional
    public void deleteWorkspace(Long tenantId, Long authUserId) {

        if (tenantId == null || tenantId <= 0) {
            throw new RuntimeException("Valid SaaS workspace is required");
        }

        if (authUserId == null) {
            throw new RuntimeException("User not authenticated");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("SaaS workspace not found"));

        /*
         * Only workspace owner is allowed to permanently delete it.
         */
        if (!authUserId.equals(tenant.getOwnerAuthUserId())) {
            throw new RuntimeException(
                    "Only the SaaS workspace owner can permanently delete the workspace");
        }

        /*
         * =========================================================
         * 1. TRANSACTION / CHILD RECORDS
         * =========================================================
         */

        // Appointments
        appointmentRepository.deleteByTenantId(tenantId);

        // Prescription children -> prescriptions
        prescriptionMedicineRepository.deleteByTenantId(tenantId);
        prescriptionRepository.deleteByTenantId(tenantId);

        // IPD children -> admissions
        ipdDailyNoteRepository.deleteByTenantId(tenantId);
        ipdChargeRepository.deleteByTenantId(tenantId);
        ipdAdmissionRepository.deleteByTenantId(tenantId);

        // OPD
        opdVisitRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 2. DIAGNOSTICS
         * =========================================================
         */

        diagnosticOrderItemRepository.deleteByTenantId(tenantId);
        diagnosticOrderRepository.deleteByTenantId(tenantId);
        diagnosticTestRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 3. BILLING / INVOICES
         * =========================================================
         */

        paymentReceiptRepository.deleteByTenantId(tenantId);
        invoiceItemRepository.deleteByTenantId(tenantId);
        invoiceRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 4. PHARMACY SALES
         * =========================================================
         */

        pharmacySaleItemRepository.deleteByTenantId(tenantId);
        pharmacySaleRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 5. SALES RETURNS
         * =========================================================
         */

        salesReturnItemRepository.deleteByTenantId(tenantId);
        salesReturnRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 6. SALES STOCK ALLOCATIONS
         * =========================================================
         */

        saleStockAllocationRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 7. SALES
         * =========================================================
         */

        saleItemRepository.deleteByTenantId(tenantId);
        saleRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 8. SALES ORDERS
         * =========================================================
         */

        salesOrderTimelineRepository.deleteByTenantId(tenantId);
        salesOrderItemRepository.deleteByTenantId(tenantId);
        salesOrderRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 9. PURCHASE RETURNS
         * =========================================================
         */

        purchaseReturnItemRepository.deleteByTenantId(tenantId);
        purchaseReturnRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 10. PURCHASES
         * =========================================================
         */

        purchaseItemRepository.deleteByTenantId(tenantId);
        purchaseRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 11. STOCK / EXPIRY
         * =========================================================
         */

        expiryActionRepository.deleteByTenantId(tenantId);
        stockMovementRepository.deleteByTenantId(tenantId);
        medicineStockRepository.deleteByTenantId(tenantId);
        medicineRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 12. LEDGER / PAYMENTS
         * =========================================================
         */

        partyLedgerEntryRepository.deleteByTenantId(tenantId);
        paymentTransactionRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 13. MASTER DATA
         * =========================================================
         */

        customerRepository.deleteByTenantId(tenantId);
        supplierRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 14. NOTIFICATIONS
         * =========================================================
         */

        notificationRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 15. WHOLESALER INVOICES
         * =========================================================
         */

        wholesalerInvoiceItemRepository.deleteByTenantId(tenantId);
        wholesalerInvoiceRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 16. DOCTOR DATA
         * =========================================================
         */

        doctorAvailabilityRepository.deleteByTenantId(tenantId);
        doctorScheduleRepository.deleteByTenantId(tenantId);
        doctorProfileRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 17. STAFF
         * =========================================================
         */

        staffRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 18. HOSPITAL STRUCTURE
         * =========================================================
         */

        // Beds reference wards, therefore beds first.
        bedRepository.deleteByTenantId(tenantId);
        wardRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 19. PATIENTS
         * =========================================================
         */

        patientRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 20. TENANT SETTINGS / PERMISSIONS
         * =========================================================
         */

        tenantMemberPermissionRepository.deleteByTenantId(tenantId);
        tenantModuleSettingRepository.deleteByTenantId(tenantId);
        tenantSettingRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 21. TENANT MEMBERS
         * =========================================================
         */

        tenantMemberRepository.deleteByTenantId(tenantId);

        /*
         * =========================================================
         * 22. FINAL TENANT DELETE
         * =========================================================
         */

        tenantRepository.delete(tenant);

        /*
         * Flush immediately so FK/database errors appear inside
         * this method/transaction instead of being deferred.
         */
        tenantRepository.flush();
    }
}