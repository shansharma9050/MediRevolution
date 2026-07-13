package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.*;
import com.example.medi.saas.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class SaasReportService {

    private final TenantAccessService tenantAccessService;

    private final SaasPatientRepository patientRepository;
    private final SaasDoctorProfileRepository doctorRepository;
    private final SaasStaffRepository staffRepository;
    private final SaasAppointmentRepository appointmentRepository;
    private final SaasOpdVisitRepository opdRepository;
    private final SaasIpdAdmissionRepository ipdRepository;
    private final SaasInvoiceRepository invoiceRepository;
    private final SaasPharmacySaleRepository pharmacySaleRepository;
    private final SaasMedicineStockRepository stockRepository;
    private final SaasMedicineRepository medicineRepository;
    private final SaasDiagnosticOrderRepository diagnosticOrderRepository;
    private final SaasPermissionService permissionService;

    public SaasReportService(
            TenantAccessService tenantAccessService,
            SaasPatientRepository patientRepository,
            SaasDoctorProfileRepository doctorRepository,
            SaasStaffRepository staffRepository,
            SaasAppointmentRepository appointmentRepository,
            SaasOpdVisitRepository opdRepository,
            SaasIpdAdmissionRepository ipdRepository,
            SaasInvoiceRepository invoiceRepository,
            SaasPharmacySaleRepository pharmacySaleRepository,
            SaasMedicineStockRepository stockRepository,
            SaasMedicineRepository medicineRepository,
            SaasDiagnosticOrderRepository diagnosticOrderRepository,
            SaasPermissionService permissionService
    ) {
        this.tenantAccessService = tenantAccessService;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.staffRepository = staffRepository;
        this.appointmentRepository = appointmentRepository;
        this.opdRepository = opdRepository;
        this.ipdRepository = ipdRepository;
        this.invoiceRepository = invoiceRepository;
        this.pharmacySaleRepository = pharmacySaleRepository;
        this.stockRepository = stockRepository;
        this.medicineRepository = medicineRepository;
        this.diagnosticOrderRepository = diagnosticOrderRepository;
        this.permissionService = permissionService;
    }

    public SaasDashboardReportResponse dashboard(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        List<SaasInvoice> invoices =
                invoiceRepository.findByTenantIdAndActiveTrueOrderByInvoiceDateTimeDesc(tenantId);

        BigDecimal totalBilling = invoices.stream()
                .map(SaasInvoice::getTotalAmount)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaid = invoices.stream()
                .map(SaasInvoice::getPaidAmount)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDue = invoices.stream()
                .map(SaasInvoice::getDueAmount)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long lowStockCount = getLowStock(tenantId).size();

        return new SaasDashboardReportResponse(
                patientRepository.countByTenantIdAndActiveTrue(tenantId),
                doctorRepository.countByTenantIdAndActiveTrue(tenantId),
                staffRepository.countByTenantIdAndActiveTrue(tenantId),
                appointmentRepository.countByTenantIdAndActiveTrue(tenantId),
                appointmentRepository.countByTenantIdAndStatusAndActiveTrue(tenantId, SaasAppointmentStatus.PENDING),
                appointmentRepository.countByTenantIdAndStatusAndActiveTrue(tenantId, SaasAppointmentStatus.COMPLETED),
                opdRepository.countByTenantIdAndActiveTrue(tenantId),
                ipdRepository.countByTenantIdAndStatusAndActiveTrue(tenantId, SaasIpdStatus.ADMITTED),
                invoiceRepository.countByTenantIdAndActiveTrue(tenantId),
                totalBilling,
                totalPaid,
                totalDue,
                pharmacySaleRepository.countByTenantIdAndActiveTrue(tenantId),
                lowStockCount,
                diagnosticOrderRepository.countByTenantIdAndDiagnosticTypeAndActiveTrue(tenantId, SaasDiagnosticType.LAB),
                diagnosticOrderRepository.countByTenantIdAndDiagnosticTypeAndActiveTrue(tenantId, SaasDiagnosticType.RADIOLOGY)
        );
    }

    public List<SaasPatientReportResponse> patientReport(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return patientRepository
                .findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(patient -> new SaasPatientReportResponse(
                        patient.getId(),
                        patient.getPatientCode(),
                        patient.getPatientName(),
                        patient.getMobile(),
                        patient.getGender(),
                        patient.getAge(),
                        patient.getCity(),
                        patient.getCreatedAt()
                ))
                .toList();
    }

    public List<SaasAppointmentReportResponse> appointmentReport(
            Long tenantId,
            LocalDate fromDate,
            LocalDate toDate
    ) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);
    	
        tenantAccessService.validateTenantAccess(tenantId);

        LocalDate start = fromDate == null ? LocalDate.now().minusMonths(1) : fromDate;
        LocalDate end = toDate == null ? LocalDate.now() : toDate;

        return appointmentRepository
                .findByTenantIdAndAppointmentDateBetweenAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
                        tenantId,
                        start,
                        end
                )
                .stream()
                .map(appointment -> {
                    SaasPatient patient = patientRepository
                            .findByIdAndTenantIdAndActiveTrue(appointment.getPatientId(), tenantId)
                            .orElse(null);

                    SaasDoctorProfile doctor = doctorRepository
                            .findByIdAndTenantIdAndActiveTrue(appointment.getDoctorStaffId(), tenantId)
                            .orElse(null);

                    return new SaasAppointmentReportResponse(
                            appointment.getId(),
                            appointment.getAppointmentDate(),
                            appointment.getAppointmentTime(),
                            patient == null ? null : patient.getPatientName(),
                            doctor == null ? null : doctor.getDoctorName(),
                            doctor == null ? null : doctor.getDepartment(),
                            appointment.getAppointmentType().name(),
                            appointment.getStatus().name()
                    );
                })
                .toList();
    }

    public List<SaasOpdReportResponse> opdReport(
            Long tenantId,
            LocalDate fromDate,
            LocalDate toDate
    ) {
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);
    	
        tenantAccessService.validateTenantAccess(tenantId);

        LocalDateTime start = startOfDay(fromDate);
        LocalDateTime end = endOfDay(toDate);

        return opdRepository
                .findByTenantIdAndVisitDateTimeBetweenAndActiveTrueOrderByVisitDateTimeDesc(
                        tenantId,
                        start,
                        end
                )
                .stream()
                .map(opd -> {
                    SaasPatient patient = patientRepository
                            .findByIdAndTenantIdAndActiveTrue(opd.getPatientId(), tenantId)
                            .orElse(null);

                    SaasDoctorProfile doctor = doctorRepository
                            .findByIdAndTenantIdAndActiveTrue(opd.getDoctorProfileId(), tenantId)
                            .orElse(null);

                    return new SaasOpdReportResponse(
                            opd.getId(),
                            opd.getOpdNumber(),
                            opd.getVisitDateTime(),
                            patient == null ? null : patient.getPatientName(),
                            doctor == null ? null : doctor.getDoctorName(),
                            opd.getDiagnosis(),
                            opd.getConsultationFee(),
                            opd.getStatus().name()
                    );
                })
                .toList();
    }

    public List<SaasIpdReportResponse> ipdReport(
            Long tenantId,
            LocalDate fromDate,
            LocalDate toDate
    ) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);
    	
        tenantAccessService.validateTenantAccess(tenantId);

        LocalDateTime start = startOfDay(fromDate);
        LocalDateTime end = endOfDay(toDate);

        return ipdRepository
                .findByTenantIdAndAdmissionDateTimeBetweenAndActiveTrueOrderByAdmissionDateTimeDesc(
                        tenantId,
                        start,
                        end
                )
                .stream()
                .map(ipd -> {
                    SaasPatient patient = patientRepository
                            .findByIdAndTenantIdAndActiveTrue(ipd.getPatientId(), tenantId)
                            .orElse(null);

                    SaasDoctorProfile doctor = doctorRepository
                            .findByIdAndTenantIdAndActiveTrue(ipd.getDoctorProfileId(), tenantId)
                            .orElse(null);

                    return new SaasIpdReportResponse(
                            ipd.getId(),
                            ipd.getIpdNumber(),
                            patient == null ? null : patient.getPatientName(),
                            doctor == null ? null : doctor.getDoctorName(),
                            String.valueOf(ipd.getWardId()),
                            String.valueOf(ipd.getBedId()),
                            ipd.getAdmissionDateTime(),
                            ipd.getDischargeDateTime(),
                            ipd.getAdvanceAmount(),
                            ipd.getTotalCharges(),
                            ipd.getStatus().name()
                    );
                })
                .toList();
    }

    public List<SaasBillingReportResponse> billingReport(
            Long tenantId,
            LocalDate fromDate,
            LocalDate toDate
    ) {
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);
    	
        tenantAccessService.validateTenantAccess(tenantId);

        LocalDateTime start = startOfDay(fromDate);
        LocalDateTime end = endOfDay(toDate);

        return invoiceRepository
                .findByTenantIdAndInvoiceDateTimeBetweenAndActiveTrueOrderByInvoiceDateTimeDesc(
                        tenantId,
                        start,
                        end
                )
                .stream()
                .map(invoice -> {
                    SaasPatient patient = patientRepository
                            .findByIdAndTenantIdAndActiveTrue(invoice.getPatientId(), tenantId)
                            .orElse(null);

                    return new SaasBillingReportResponse(
                            invoice.getId(),
                            invoice.getInvoiceNumber(),
                            invoice.getInvoiceType().name(),
                            patient == null ? null : patient.getPatientName(),
                            invoice.getTotalAmount(),
                            invoice.getPaidAmount(),
                            invoice.getDueAmount(),
                            invoice.getPaymentStatus().name(),
                            invoice.getPaymentMode() == null ? null : invoice.getPaymentMode().name(),
                            invoice.getInvoiceDateTime()
                    );
                })
                .toList();
    }

    public List<SaasPharmacyReportResponse> pharmacyReport(
            Long tenantId,
            LocalDate fromDate,
            LocalDate toDate
    ) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);
    	
        tenantAccessService.validateTenantAccess(tenantId);

        LocalDateTime start = startOfDay(fromDate);
        LocalDateTime end = endOfDay(toDate);

        return pharmacySaleRepository
                .findByTenantIdAndSaleDateTimeBetweenAndActiveTrueOrderBySaleDateTimeDesc(
                        tenantId,
                        start,
                        end
                )
                .stream()
                .map(sale -> {
                    SaasPatient patient = patientRepository
                            .findByIdAndTenantIdAndActiveTrue(sale.getPatientId(), tenantId)
                            .orElse(null);

                    return new SaasPharmacyReportResponse(
                            sale.getId(),
                            sale.getSaleNumber(),
                            patient == null ? null : patient.getPatientName(),
                            sale.getTotalAmount(),
                            sale.getPaidAmount(),
                            sale.getDueAmount(),
                            sale.getPaymentStatus().name(),
                            sale.getSaleDateTime()
                    );
                })
                .toList();
    }

    public List<SaasLowStockReportResponse> getLowStock(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return stockRepository
                .findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(stock -> {
                    SaasMedicine medicine = medicineRepository
                            .findByIdAndTenantIdAndActiveTrue(stock.getMedicineId(), tenantId)
                            .orElse(null);

                    int reorderLevel = medicine == null || medicine.getReorderLevel() == null
                            ? 10
                            : medicine.getReorderLevel();

                    int currentQty = stock.getCurrentQuantity() == null ? 0 : stock.getCurrentQuantity();

                    boolean expired = stock.getExpiryDate() != null
                            && stock.getExpiryDate().isBefore(LocalDate.now());

                    if (currentQty > reorderLevel && !expired) {
                        return null;
                    }

                    return new SaasLowStockReportResponse(
                            stock.getId(),
                            medicine == null ? null : medicine.getMedicineName(),
                            stock.getBatchNumber(),
                            stock.getExpiryDate(),
                            stock.getCurrentQuantity(),
                            reorderLevel,
                            expired
                    );
                })
                .filter(item -> item != null)
                .toList();
    }

    public List<SaasDiagnosticReportResponse> diagnosticReport(
            Long tenantId,
            String type,
            LocalDate fromDate,
            LocalDate toDate
    ) {
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.REPORTS,
    	        SaasPermissionAction.VIEW
    	);
    	
        tenantAccessService.validateTenantAccess(tenantId);

        SaasDiagnosticType diagnosticType = SaasDiagnosticType.valueOf(type.toUpperCase());

        LocalDateTime start = startOfDay(fromDate);
        LocalDateTime end = endOfDay(toDate);

        return diagnosticOrderRepository
                .findByTenantIdAndDiagnosticTypeAndOrderDateTimeBetweenAndActiveTrueOrderByOrderDateTimeDesc(
                        tenantId,
                        diagnosticType,
                        start,
                        end
                )
                .stream()
                .map(order -> {
                    SaasPatient patient = patientRepository
                            .findByIdAndTenantIdAndActiveTrue(order.getPatientId(), tenantId)
                            .orElse(null);

                    SaasDoctorProfile doctor = null;

                    if (order.getDoctorProfileId() != null) {
                        doctor = doctorRepository
                                .findByIdAndTenantIdAndActiveTrue(order.getDoctorProfileId(), tenantId)
                                .orElse(null);
                    }

                    return new SaasDiagnosticReportResponse(
                            order.getId(),
                            order.getOrderNumber(),
                            order.getDiagnosticType().name(),
                            patient == null ? null : patient.getPatientName(),
                            doctor == null ? null : doctor.getDoctorName(),
                            order.getTotalAmount(),
                            order.getStatus().name(),
                            order.getInvoiceId(),
                            order.getOrderDateTime()
                    );
                })
                .toList();
    }

    private LocalDateTime startOfDay(LocalDate date) {
        LocalDate finalDate = date == null ? LocalDate.now().minusMonths(1) : date;
        return LocalDateTime.of(finalDate, LocalTime.MIN);
    }

    private LocalDateTime endOfDay(LocalDate date) {
        LocalDate finalDate = date == null ? LocalDate.now() : date;
        return LocalDateTime.of(finalDate, LocalTime.MAX);
    }
}