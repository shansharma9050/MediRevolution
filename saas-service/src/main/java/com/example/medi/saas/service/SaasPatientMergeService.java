package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasPatientMergeRequest;
import com.example.medi.saas.dto.SaasPatientMergeResponse;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class SaasPatientMergeService {

    private static final String STATUS_MERGED =
            "MERGED";

    private static final String STATUS_UNMERGED =
            "UNMERGED";


    private final SaasPatientRepository patientRepository;

    private final SaasPatientMergeRepository mergeRepository;

    private final SaasAppointmentRepository appointmentRepository;

    private final SaasPrescriptionRepository prescriptionRepository;

    private final SaasOpdVisitRepository opdVisitRepository;

    private final SaasIpdAdmissionRepository ipdAdmissionRepository;

    private final SaasDiagnosticOrderRepository diagnosticOrderRepository;

    private final SaasInvoiceRepository invoiceRepository;

    private final SaasPatientDocumentRepository documentRepository;

    private final SaasPatientAllergyRepository allergyRepository;

    private final TenantAccessService tenantAccessService;

    private final SaasPermissionService permissionService;

    private final ObjectMapper objectMapper;


    public SaasPatientMergeService(
            SaasPatientRepository patientRepository,
            SaasPatientMergeRepository mergeRepository,
            SaasAppointmentRepository appointmentRepository,
            SaasPrescriptionRepository prescriptionRepository,
            SaasOpdVisitRepository opdVisitRepository,
            SaasIpdAdmissionRepository ipdAdmissionRepository,
            SaasDiagnosticOrderRepository diagnosticOrderRepository,
            SaasInvoiceRepository invoiceRepository,
            SaasPatientDocumentRepository documentRepository,
            SaasPatientAllergyRepository allergyRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService,
            ObjectMapper objectMapper
    ) {

        this.patientRepository =
                patientRepository;

        this.mergeRepository =
                mergeRepository;

        this.appointmentRepository =
                appointmentRepository;

        this.prescriptionRepository =
                prescriptionRepository;

        this.opdVisitRepository =
                opdVisitRepository;

        this.ipdAdmissionRepository =
                ipdAdmissionRepository;

        this.diagnosticOrderRepository =
                diagnosticOrderRepository;

        this.invoiceRepository =
                invoiceRepository;

        this.documentRepository =
                documentRepository;

        this.allergyRepository =
                allergyRepository;

        this.tenantAccessService =
                tenantAccessService;

        this.permissionService =
                permissionService;

        this.objectMapper =
                objectMapper;
    }


    /*
     * ================================================================
     * MERGE
     * ================================================================
     */

    @Transactional
    public SaasPatientMergeResponse mergePatients(
            SaasPatientMergeRequest request
    ) {

        validateMergeRequest(
                request
        );


        Long tenantId =
                request.getTenantId();


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.UPDATE
        );


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.DELETE
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        SaasPatient target =
                patientRepository
                        .findByIdAndTenantIdAndActiveTrue(
                                request.getTargetPatientId(),
                                tenantId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Target patient not found"
                                        )
                        );


        SaasPatient source =
                patientRepository
                        .findByIdAndTenantIdAndActiveTrue(
                                request.getSourcePatientId(),
                                tenantId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Duplicate patient not found"
                                        )
                        );


        validateMergeState(
                tenantId,
                target,
                source
        );


        /*
         * ============================================================
         * LOAD SOURCE RECORDS
         * ============================================================
         */

        List<SaasAppointment> appointments =
                appointmentRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByAppointmentDateDescAppointmentTimeDesc(
                                tenantId,
                                source.getId()
                        );


        List<SaasPrescription> prescriptions =
                prescriptionRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                                tenantId,
                                source.getId()
                        );


        List<SaasOpdVisit> opdVisits =
                opdVisitRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByVisitDateTimeDesc(
                                tenantId,
                                source.getId()
                        );


        List<SaasIpdAdmission> ipdAdmissions =
                ipdAdmissionRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByAdmissionDateTimeDesc(
                                tenantId,
                                source.getId()
                        );


        List<SaasDiagnosticOrder> diagnosticOrders =
                diagnosticOrderRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByOrderDateTimeDesc(
                                tenantId,
                                source.getId()
                        );


        List<SaasInvoice> invoices =
                invoiceRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByInvoiceDateTimeDesc(
                                tenantId,
                                source.getId()
                        );


        List<SaasPatientDocument> documents =
                documentRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                                tenantId,
                                source.getId()
                        );


        List<SaasPatientAllergy> allergies =
                allergyRepository
                        .findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                                tenantId,
                                source.getId()
                        );


        /*
         * ============================================================
         * CAPTURE EXACT RECORD IDS FOR SAFE UNMERGE
         * ============================================================
         */

        MergeSnapshot snapshot =
                new MergeSnapshot(

                        appointments
                                .stream()
                                .map(SaasAppointment::getId)
                                .filter(Objects::nonNull)
                                .toList(),

                        prescriptions
                                .stream()
                                .map(SaasPrescription::getId)
                                .filter(Objects::nonNull)
                                .toList(),

                        opdVisits
                                .stream()
                                .map(SaasOpdVisit::getId)
                                .filter(Objects::nonNull)
                                .toList(),

                        ipdAdmissions
                                .stream()
                                .map(SaasIpdAdmission::getId)
                                .filter(Objects::nonNull)
                                .toList(),

                        diagnosticOrders
                                .stream()
                                .map(SaasDiagnosticOrder::getId)
                                .filter(Objects::nonNull)
                                .toList(),

                        invoices
                                .stream()
                                .map(SaasInvoice::getId)
                                .filter(Objects::nonNull)
                                .toList(),

                        documents
                                .stream()
                                .map(SaasPatientDocument::getId)
                                .filter(Objects::nonNull)
                                .toList(),

                        allergies
                                .stream()
                                .map(SaasPatientAllergy::getId)
                                .filter(Objects::nonNull)
                                .toList()
                );


        /*
         * ============================================================
         * MOVE RECORDS TO CANONICAL PATIENT
         * ============================================================
         */

        for (SaasAppointment item : appointments) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        appointmentRepository.saveAll(
                appointments
        );


        for (SaasPrescription item : prescriptions) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        prescriptionRepository.saveAll(
                prescriptions
        );


        for (SaasOpdVisit item : opdVisits) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        opdVisitRepository.saveAll(
                opdVisits
        );


        for (SaasIpdAdmission item : ipdAdmissions) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        ipdAdmissionRepository.saveAll(
                ipdAdmissions
        );


        for (SaasDiagnosticOrder item : diagnosticOrders) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        diagnosticOrderRepository.saveAll(
                diagnosticOrders
        );


        for (SaasInvoice item : invoices) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        invoiceRepository.saveAll(
                invoices
        );


        for (SaasPatientDocument item : documents) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        documentRepository.saveAll(
                documents
        );


        for (SaasPatientAllergy item : allergies) {

            item.setPatientId(
                    target.getId()
            );

            item.touch();
        }

        allergyRepository.saveAll(
                allergies
        );


        /*
         * ============================================================
         * DEACTIVATE DUPLICATE PATIENT
         * ============================================================
         */

        source.setActive(
                false
        );

        source.touch();

        patientRepository.save(
                source
        );


        /*
         * ============================================================
         * MERGE AUDIT RECORD
         * ============================================================
         */

        SaasPatientMerge merge =
                new SaasPatientMerge();


        merge.setTenantId(
                tenantId
        );

        merge.setTargetPatientId(
                target.getId()
        );

        merge.setSourcePatientId(
                source.getId()
        );

        merge.setSourceAuthUserId(
                source.getAuthUserId()
        );

        merge.setTargetPatientCode(
                target.getPatientCode()
        );

        merge.setTargetPatientName(
                target.getPatientName()
        );

        merge.setSourcePatientCode(
                source.getPatientCode()
        );

        merge.setSourcePatientName(
                source.getPatientName()
        );

        merge.setStatus(
                STATUS_MERGED
        );

        merge.setReason(
                cleanText(
                        request.getReason()
                )
        );

        merge.setMovedRecordSnapshotJson(
                serializeSnapshot(
                        snapshot
                )
        );

        merge.setMergedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        merge.setMergedAt(
                LocalDateTime.now()
        );


        SaasPatientMerge saved =
                mergeRepository.save(
                        merge
                );


        return toResponse(
                saved,
                snapshot
        );
    }


    /*
     * ================================================================
     * UNMERGE
     * ================================================================
     */

    @Transactional
    public SaasPatientMergeResponse unmerge(
            Long tenantId,
            Long mergeId
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (mergeId == null) {

            throw new RuntimeException(
                    "mergeId is required"
            );
        }


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.UPDATE
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        SaasPatientMerge merge =
                mergeRepository
                        .findByIdAndTenantId(
                                mergeId,
                                tenantId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Patient merge record not found"
                                        )
                        );


        if (
                !STATUS_MERGED.equalsIgnoreCase(
                        merge.getStatus()
                )
        ) {

            throw new RuntimeException(
                    "This patient merge has already been reversed"
            );
        }


        SaasPatient source =
                patientRepository
                        .findById(
                                merge.getSourcePatientId()
                        )
                        .filter(
                                patient ->
                                        tenantId.equals(
                                                patient.getTenantId()
                                        )
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Source patient no longer exists"
                                        )
                        );


        SaasPatient target =
                patientRepository
                        .findById(
                                merge.getTargetPatientId()
                        )
                        .filter(
                                patient ->
                                        tenantId.equals(
                                                patient.getTenantId()
                                        )
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Target patient no longer exists"
                                        )
                        );


        MergeSnapshot snapshot =
                deserializeSnapshot(
                        merge.getMovedRecordSnapshotJson()
                );


        restoreAppointments(
                snapshot.appointmentIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        restorePrescriptions(
                snapshot.prescriptionIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        restoreOpdVisits(
                snapshot.opdIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        restoreIpdAdmissions(
                snapshot.ipdIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        restoreDiagnostics(
                snapshot.diagnosticIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        restoreInvoices(
                snapshot.invoiceIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        restoreDocuments(
                snapshot.documentIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        restoreAllergies(
                snapshot.allergyIds(),
                tenantId,
                target.getId(),
                source.getId()
        );


        source.setActive(
                true
        );

        source.touch();

        patientRepository.save(
                source
        );


        merge.setStatus(
                STATUS_UNMERGED
        );

        merge.setUnmergedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        merge.setUnmergedAt(
                LocalDateTime.now()
        );


        SaasPatientMerge saved =
                mergeRepository.save(
                        merge
                );


        return toResponse(
                saved,
                snapshot
        );
    }


    /*
     * ================================================================
     * HISTORY
     * ================================================================
     */

    @Transactional(readOnly = true)
    public List<SaasPatientMergeResponse> getPatientMergeHistory(
            Long tenantId,
            Long targetPatientId
    ) {

        if (
                tenantId == null ||
                targetPatientId == null
        ) {

            throw new RuntimeException(
                    "tenantId and patientId are required"
            );
        }


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.VIEW
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        return mergeRepository
                .findByTenantIdAndTargetPatientIdOrderByMergedAtDesc(
                        tenantId,
                        targetPatientId
                )
                .stream()
                .map(
                        item ->
                                toResponse(
                                        item,
                                        deserializeSnapshot(
                                                item.getMovedRecordSnapshotJson()
                                        )
                                )
                )
                .toList();
    }


    /*
     * ================================================================
     * RESTORE HELPERS
     * ================================================================
     */

    private void restoreAppointments(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasAppointment> changed =
                new ArrayList<>();


        for (
                SaasAppointment item :
                appointmentRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        appointmentRepository.saveAll(
                changed
        );
    }


    private void restorePrescriptions(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasPrescription> changed =
                new ArrayList<>();


        for (
                SaasPrescription item :
                prescriptionRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        prescriptionRepository.saveAll(
                changed
        );
    }


    private void restoreOpdVisits(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasOpdVisit> changed =
                new ArrayList<>();


        for (
                SaasOpdVisit item :
                opdVisitRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        opdVisitRepository.saveAll(
                changed
        );
    }


    private void restoreIpdAdmissions(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasIpdAdmission> changed =
                new ArrayList<>();


        for (
                SaasIpdAdmission item :
                ipdAdmissionRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        ipdAdmissionRepository.saveAll(
                changed
        );
    }


    private void restoreDiagnostics(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasDiagnosticOrder> changed =
                new ArrayList<>();


        for (
                SaasDiagnosticOrder item :
                diagnosticOrderRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        diagnosticOrderRepository.saveAll(
                changed
        );
    }


    private void restoreInvoices(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasInvoice> changed =
                new ArrayList<>();


        for (
                SaasInvoice item :
                invoiceRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        invoiceRepository.saveAll(
                changed
        );
    }


    private void restoreDocuments(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasPatientDocument> changed =
                new ArrayList<>();


        for (
                SaasPatientDocument item :
                documentRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        documentRepository.saveAll(
                changed
        );
    }


    private void restoreAllergies(
            List<Long> ids,
            Long tenantId,
            Long targetPatientId,
            Long sourcePatientId
    ) {

        List<SaasPatientAllergy> changed =
                new ArrayList<>();


        for (
                SaasPatientAllergy item :
                allergyRepository.findAllById(
                        safeIds(ids)
                )
        ) {

            if (
                    tenantId.equals(item.getTenantId()) &&
                    targetPatientId.equals(item.getPatientId())
            ) {

                item.setPatientId(
                        sourcePatientId
                );

                item.touch();

                changed.add(
                        item
                );
            }
        }


        allergyRepository.saveAll(
                changed
        );
    }


    /*
     * ================================================================
     * VALIDATION
     * ================================================================
     */

    private void validateMergeRequest(
            SaasPatientMergeRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Patient merge request is required"
            );
        }


        if (request.getTenantId() == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (
                request.getTargetPatientId() == null ||
                request.getSourcePatientId() == null
        ) {

            throw new RuntimeException(
                    "Both target and duplicate patient are required"
            );
        }


        if (
                request.getTargetPatientId()
                        .equals(
                                request.getSourcePatientId()
                        )
        ) {

            throw new RuntimeException(
                    "A patient cannot be merged into itself"
            );
        }
    }


    private void validateMergeState(
            Long tenantId,
            SaasPatient target,
            SaasPatient source
    ) {

        if (
                mergeRepository
                        .existsByTenantIdAndSourcePatientIdAndStatus(
                                tenantId,
                                source.getId(),
                                STATUS_MERGED
                        )
        ) {

            throw new RuntimeException(
                    "Duplicate patient is already merged"
            );
        }


        if (
                mergeRepository
                        .existsByTenantIdAndTargetPatientIdAndStatus(
                                tenantId,
                                source.getId(),
                                STATUS_MERGED
                        )
        ) {

            throw new RuntimeException(
                    "This patient already has merged records and cannot be used as a duplicate source"
            );
        }


        if (
                mergeRepository
                        .existsByTenantIdAndSourcePatientIdAndStatus(
                                tenantId,
                                target.getId(),
                                STATUS_MERGED
                        )
        ) {

            throw new RuntimeException(
                    "Target patient is itself merged into another patient"
            );
        }
    }


    /*
     * ================================================================
     * SNAPSHOT
     * ================================================================
     */

    private String serializeSnapshot(
            MergeSnapshot snapshot
    ) {

        try {

            return objectMapper.writeValueAsString(
                    snapshot
            );

        } catch (JsonProcessingException exception) {

            throw new RuntimeException(
                    "Unable to create patient merge audit snapshot",
                    exception
            );
        }
    }


    private MergeSnapshot deserializeSnapshot(
            String value
    ) {

        if (
                value == null ||
                value.isBlank()
        ) {

            return MergeSnapshot.empty();
        }


        try {

            MergeSnapshot snapshot =
                    objectMapper.readValue(
                            value,
                            MergeSnapshot.class
                    );


            return snapshot == null
                    ? MergeSnapshot.empty()
                    : snapshot;


        } catch (JsonProcessingException exception) {

            throw new RuntimeException(
                    "Unable to read patient merge audit snapshot",
                    exception
            );
        }
    }


    private List<Long> safeIds(
            List<Long> ids
    ) {

        return ids == null
                ? List.of()
                : ids;
    }


    private String cleanText(
            String value
    ) {

        if (
                value == null ||
                value.isBlank()
        ) {

            return null;
        }


        return value.trim();
    }


    /*
     * ================================================================
     * RESPONSE
     * ================================================================
     */

    private SaasPatientMergeResponse toResponse(
            SaasPatientMerge merge,
            MergeSnapshot snapshot
    ) {

        MergeSnapshot data =
                snapshot == null
                        ? MergeSnapshot.empty()
                        : snapshot;


        return new SaasPatientMergeResponse(

                merge.getId(),

                merge.getTenantId(),

                merge.getTargetPatientId(),

                merge.getTargetPatientCode(),

                merge.getTargetPatientName(),

                merge.getSourcePatientId(),

                merge.getSourcePatientCode(),

                merge.getSourcePatientName(),

                merge.getStatus(),

                merge.getReason(),

                data.appointmentIds().size(),

                data.prescriptionIds().size(),

                data.opdIds().size(),

                data.ipdIds().size(),

                data.diagnosticIds().size(),

                data.invoiceIds().size(),

                data.documentIds().size(),

                data.allergyIds().size(),

                merge.getMergedAt(),

                merge.getUnmergedAt()
        );
    }


    private record MergeSnapshot(

            List<Long> appointmentIds,

            List<Long> prescriptionIds,

            List<Long> opdIds,

            List<Long> ipdIds,

            List<Long> diagnosticIds,

            List<Long> invoiceIds,

            List<Long> documentIds,

            List<Long> allergyIds

    ) {

        private static MergeSnapshot empty() {

            return new MergeSnapshot(
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of()
            );
        }


        public MergeSnapshot {

            appointmentIds =
                    appointmentIds == null
                            ? List.of()
                            : appointmentIds;

            prescriptionIds =
                    prescriptionIds == null
                            ? List.of()
                            : prescriptionIds;

            opdIds =
                    opdIds == null
                            ? List.of()
                            : opdIds;

            ipdIds =
                    ipdIds == null
                            ? List.of()
                            : ipdIds;

            diagnosticIds =
                    diagnosticIds == null
                            ? List.of()
                            : diagnosticIds;

            invoiceIds =
                    invoiceIds == null
                            ? List.of()
                            : invoiceIds;

            documentIds =
                    documentIds == null
                            ? List.of()
                            : documentIds;

            allergyIds =
                    allergyIds == null
                            ? List.of()
                            : allergyIds;
        }
    }
}