package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.SaasDoctorProfile;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasPrescription;
import com.example.medi.saas.entity.SaasPrescriptionMedicine;
import com.example.medi.saas.enums.SaasAppointmentStatus;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasAppointmentRepository;
import com.example.medi.saas.repository.SaasDoctorProfileRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.repository.SaasPrescriptionMedicineRepository;
import com.example.medi.saas.repository.SaasPrescriptionRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SaasPrescriptionService {

    private final SaasPrescriptionRepository prescriptionRepository;
    private final SaasPrescriptionMedicineRepository medicineRepository;
    private final SaasPatientRepository patientRepository;
    private final SaasDoctorProfileRepository doctorRepository;
    private final SaasAppointmentRepository appointmentRepository;
    private final TenantAccessService tenantAccessService;
    private final SaasPermissionService permissionService;

    public SaasPrescriptionService(
            SaasPrescriptionRepository prescriptionRepository,
            SaasPrescriptionMedicineRepository medicineRepository,
            SaasPatientRepository patientRepository,
            SaasDoctorProfileRepository doctorRepository,
            SaasAppointmentRepository appointmentRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.medicineRepository = medicineRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.tenantAccessService = tenantAccessService;
        this.permissionService = permissionService;
    }

    @Transactional
    public SaasPrescriptionResponse createPrescription(SaasPrescriptionRequest request) {
    	
    	permissionService.requirePermission(
    	        request.getTenantId(),
    	        TenantModule.PRESCRIPTIONS,
    	        SaasPermissionAction.CREATE
    	);

        validateRequest(request);

        tenantAccessService.validateTenantAccess(request.getTenantId());

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(request.getPatientId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Patient not found in selected workspace"));

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(request.getDoctorProfileId(), request.getTenantId())
                .orElseThrow(() -> new RuntimeException("Doctor not found in selected workspace"));

        if (request.getAppointmentId() != null) {
            appointmentRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getAppointmentId(), request.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Appointment not found in selected workspace"));
        }

        SaasPrescription prescription = new SaasPrescription();
        prescription.setTenantId(request.getTenantId());
        prescription.setPatientId(patient.getId());
        prescription.setDoctorProfileId(doctor.getId());
        prescription.setAppointmentId(request.getAppointmentId());
        prescription.setDiagnosis(request.getDiagnosis());
        prescription.setClinicalNotes(request.getClinicalNotes());
        prescription.setAdvice(request.getAdvice());
        prescription.setLabTests(request.getLabTests());
        prescription.setFollowUpAdvice(request.getFollowUpAdvice());
        prescription.setFollowUpDate(request.getFollowUpDate());
        prescription.setBloodPressure(request.getBloodPressure());
        prescription.setPulse(request.getPulse());
        prescription.setTemperature(request.getTemperature());
        prescription.setSpo2(request.getSpo2());
        prescription.setWeight(request.getWeight());
        prescription.setHeight(request.getHeight());
        prescription.setSugarLevel(request.getSugarLevel());
        prescription.setCreatedByAuthUserId(CurrentUserUtil.getUserId());
        prescription.setActive(true);

        SaasPrescription savedPrescription = prescriptionRepository.save(prescription);

        saveMedicines(request.getTenantId(), savedPrescription.getId(), request.getMedicines());

        /*
         * Optional but useful:
         * Prescription banne ke baad appointment completed kar do.
         */
        if (request.getAppointmentId() != null) {
            appointmentRepository
                    .findByIdAndTenantIdAndActiveTrue(request.getAppointmentId(), request.getTenantId())
                    .ifPresent(appointment -> {
                        appointment.setStatus(SaasAppointmentStatus.COMPLETED);
                        appointment.touch();
                        appointmentRepository.save(appointment);
                    });
        }

        return toResponse(savedPrescription);
    }

    public List<SaasPrescriptionResponse> getPrescriptions(Long tenantId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PRESCRIPTIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        return prescriptionRepository
                .findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SaasPrescriptionResponse getPrescription(Long tenantId, Long prescriptionId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PRESCRIPTIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasPrescription prescription = prescriptionRepository
                .findByIdAndTenantIdAndActiveTrue(prescriptionId, tenantId)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        return toResponse(prescription);
    }

    public List<SaasPrescriptionResponse> getPatientEmr(Long tenantId, Long patientId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PRESCRIPTIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        patientRepository
                .findByIdAndTenantIdAndActiveTrue(patientId, tenantId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        return prescriptionRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(tenantId, patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasPrescriptionResponse> getDoctorPrescriptions(Long tenantId, Long doctorProfileId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PRESCRIPTIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        doctorRepository
                .findByIdAndTenantIdAndActiveTrue(doctorProfileId, tenantId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        return prescriptionRepository
                .findByTenantIdAndDoctorProfileIdAndActiveTrueOrderByCreatedAtDesc(tenantId, doctorProfileId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SaasPrescriptionResponse> getAppointmentPrescriptions(Long tenantId, Long appointmentId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PRESCRIPTIONS,
    	        SaasPermissionAction.VIEW
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        appointmentRepository
                .findByIdAndTenantIdAndActiveTrue(appointmentId, tenantId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        return prescriptionRepository
                .findByTenantIdAndAppointmentIdAndActiveTrueOrderByCreatedAtDesc(tenantId, appointmentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ApiResponse deletePrescription(Long tenantId, Long prescriptionId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.PRESCRIPTIONS,
    	        SaasPermissionAction.DELETE
    	);

        tenantAccessService.validateTenantAccess(tenantId);

        SaasPrescription prescription = prescriptionRepository
                .findByIdAndTenantIdAndActiveTrue(prescriptionId, tenantId)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        prescription.setActive(false);
        prescription.touch();

        prescriptionRepository.save(prescription);

        return new ApiResponse(true, "Prescription deleted successfully");
    }

    private void validateRequest(SaasPrescriptionRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        if (request.getPatientId() == null) {
            throw new RuntimeException("patientId is required");
        }

        if (request.getDoctorProfileId() == null) {
            throw new RuntimeException("doctorProfileId is required");
        }

        if (request.getDiagnosis() == null || request.getDiagnosis().isBlank()) {
            throw new RuntimeException("Diagnosis is required");
        }
    }

    private void saveMedicines(
            Long tenantId,
            Long prescriptionId,
            List<SaasPrescriptionMedicineRequest> medicines
    ) {
        if (medicines == null || medicines.isEmpty()) {
            return;
        }

        for (SaasPrescriptionMedicineRequest item : medicines) {

            if (item.getMedicineName() == null || item.getMedicineName().isBlank()) {
                continue;
            }

            SaasPrescriptionMedicine medicine = new SaasPrescriptionMedicine();
            medicine.setTenantId(tenantId);
            medicine.setPrescriptionId(prescriptionId);
            medicine.setMedicineName(item.getMedicineName());
            medicine.setDosage(item.getDosage());
            medicine.setFrequency(item.getFrequency());
            medicine.setDuration(item.getDuration());
            medicine.setInstructions(item.getInstructions());

            medicineRepository.save(medicine);
        }
    }

    private SaasPrescriptionResponse toResponse(SaasPrescription prescription) {

        SaasPatient patient = patientRepository
                .findByIdAndTenantIdAndActiveTrue(prescription.getPatientId(), prescription.getTenantId())
                .orElse(null);

        SaasDoctorProfile doctor = doctorRepository
                .findByIdAndTenantIdAndActiveTrue(prescription.getDoctorProfileId(), prescription.getTenantId())
                .orElse(null);

        List<SaasPrescriptionMedicineResponse> medicines =
                medicineRepository
                        .findByTenantIdAndPrescriptionIdOrderByIdAsc(
                                prescription.getTenantId(),
                                prescription.getId()
                        )
                        .stream()
                        .map(medicine -> new SaasPrescriptionMedicineResponse(
                                medicine.getId(),
                                medicine.getMedicineName(),
                                medicine.getDosage(),
                                medicine.getFrequency(),
                                medicine.getDuration(),
                                medicine.getInstructions()
                        ))
                        .toList();

        return new SaasPrescriptionResponse(
                prescription.getId(),
                prescription.getTenantId(),
                prescription.getPatientId(),
                patient == null ? null : patient.getPatientCode(),
                patient == null ? null : patient.getPatientName(),
                patient == null ? null : patient.getMobile(),
                prescription.getDoctorProfileId(),
                doctor == null ? null : doctor.getDoctorName(),
                doctor == null ? null : doctor.getDepartment(),
                doctor == null ? null : doctor.getSpecialization(),
                prescription.getAppointmentId(),
                prescription.getDiagnosis(),
                prescription.getClinicalNotes(),
                prescription.getAdvice(),
                prescription.getLabTests(),
                prescription.getFollowUpAdvice(),
                prescription.getFollowUpDate(),
                prescription.getBloodPressure(),
                prescription.getPulse(),
                prescription.getTemperature(),
                prescription.getSpo2(),
                prescription.getWeight(),
                prescription.getHeight(),
                prescription.getSugarLevel(),
                medicines,
                prescription.getActive(),
                prescription.getCreatedAt()
        );
    }
}