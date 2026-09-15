package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatientDocumentRequest;
import com.example.medi.saas.dto.SaasPatientDocumentResponse;
import com.example.medi.saas.entity.SaasPatient;
import com.example.medi.saas.entity.SaasPatientDocument;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasPatientDocumentRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SaasPatientDocumentService {

    private final SaasPatientDocumentRepository documentRepository;

    private final SaasPatientRepository patientRepository;

    private final TenantAccessService tenantAccessService;

    private final SaasPermissionService permissionService;


    public SaasPatientDocumentService(
            SaasPatientDocumentRepository documentRepository,
            SaasPatientRepository patientRepository,
            TenantAccessService tenantAccessService,
            SaasPermissionService permissionService
    ) {

        this.documentRepository =
                documentRepository;

        this.patientRepository =
                patientRepository;

        this.tenantAccessService =
                tenantAccessService;

        this.permissionService =
                permissionService;
    }


    /*
     * ================================================================
     * CREATE
     * ================================================================
     */

    @Transactional
    public SaasPatientDocumentResponse createDocument(
            SaasPatientDocumentRequest request
    ) {

        validateCreateRequest(
                request
        );


        Long tenantId =
                request.getTenantId();


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.CREATE
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        validatePatient(
                tenantId,
                request.getPatientId()
        );


        SaasPatientDocument document =
                new SaasPatientDocument();


        document.setTenantId(
                tenantId
        );

        document.setPatientId(
                request.getPatientId()
        );

        document.setAppointmentId(
                request.getAppointmentId()
        );

        document.setPrescriptionId(
                request.getPrescriptionId()
        );

        document.setDiagnosticOrderId(
                request.getDiagnosticOrderId()
        );

        document.setOpdVisitId(
                request.getOpdVisitId()
        );

        document.setIpdAdmissionId(
                request.getIpdAdmissionId()
        );

        document.setInvoiceId(
                request.getInvoiceId()
        );

        document.setDocumentType(
                request.getDocumentType()
        );

        document.setTitle(
                cleanRequiredText(
                        request.getTitle()
                )
        );

        document.setFileName(
                cleanText(
                        request.getFileName()
                )
        );

        document.setFileUrl(
                cleanRequiredText(
                        request.getFileUrl()
                )
        );

        document.setMimeType(
                cleanText(
                        request.getMimeType()
                )
        );

        document.setFileExtension(
                normalizeExtension(
                        request.getFileExtension()
                )
        );

        document.setFileSizeBytes(
                normalizeFileSize(
                        request.getFileSizeBytes()
                )
        );

        document.setDocumentDate(
                request.getDocumentDate()
        );

        document.setDescription(
                cleanText(
                        request.getDescription()
                )
        );

        document.setActive(
                true
        );

        document.setCreatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );


        SaasPatientDocument saved =
                documentRepository.save(
                        document
                );


        return toResponse(
                saved
        );
    }


    /*
     * ================================================================
     * LIST PATIENT DOCUMENTS
     * ================================================================
     */

    @Transactional(readOnly = true)
    public List<SaasPatientDocumentResponse> getPatientDocuments(
            Long tenantId,
            Long patientId
    ) {

        validateTenantAndPatientId(
                tenantId,
                patientId
        );


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.VIEW
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        validatePatient(
                tenantId,
                patientId
        );


        return documentRepository
                .findByTenantIdAndPatientIdAndActiveTrueOrderByCreatedAtDesc(
                        tenantId,
                        patientId
                )
                .stream()
                .map(
                        this::toResponse
                )
                .toList();
    }


    /*
     * ================================================================
     * GET ONE DOCUMENT
     * ================================================================
     */

    @Transactional(readOnly = true)
    public SaasPatientDocumentResponse getDocument(
            Long tenantId,
            Long documentId
    ) {

        validateIds(
                tenantId,
                documentId
        );


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.VIEW
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        SaasPatientDocument document =
                findActiveDocument(
                        tenantId,
                        documentId
                );


        return toResponse(
                document
        );
    }


    /*
     * ================================================================
     * UPDATE
     * ================================================================
     */

    @Transactional
    public SaasPatientDocumentResponse updateDocument(
            Long tenantId,
            Long documentId,
            SaasPatientDocumentRequest request
    ) {

        validateIds(
                tenantId,
                documentId
        );


        if (request == null) {

            throw new RuntimeException(
                    "Document request is required"
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


        SaasPatientDocument document =
                findActiveDocument(
                        tenantId,
                        documentId
                );


        /*
         * Patient cannot silently change while editing document metadata.
         */
        if (
                request.getPatientId() != null &&
                !document.getPatientId()
                        .equals(
                                request.getPatientId()
                        )
        ) {

            throw new RuntimeException(
                    "Document patient cannot be changed"
            );
        }


        if (
                request.getTenantId() != null &&
                !tenantId.equals(
                        request.getTenantId()
                )
        ) {

            throw new RuntimeException(
                    "Invalid tenantId"
            );
        }


        if (
                request.getDocumentType() == null
        ) {

            throw new RuntimeException(
                    "Document type is required"
            );
        }


        document.setDocumentType(
                request.getDocumentType()
        );

        document.setTitle(
                cleanRequiredText(
                        request.getTitle()
                )
        );

        document.setFileName(
                cleanText(
                        request.getFileName()
                )
        );

        document.setFileUrl(
                cleanRequiredText(
                        request.getFileUrl()
                )
        );

        document.setMimeType(
                cleanText(
                        request.getMimeType()
                )
        );

        document.setFileExtension(
                normalizeExtension(
                        request.getFileExtension()
                )
        );

        document.setFileSizeBytes(
                normalizeFileSize(
                        request.getFileSizeBytes()
                )
        );

        document.setDocumentDate(
                request.getDocumentDate()
        );

        document.setDescription(
                cleanText(
                        request.getDescription()
                )
        );

        document.setAppointmentId(
                request.getAppointmentId()
        );

        document.setPrescriptionId(
                request.getPrescriptionId()
        );

        document.setDiagnosticOrderId(
                request.getDiagnosticOrderId()
        );

        document.setOpdVisitId(
                request.getOpdVisitId()
        );

        document.setIpdAdmissionId(
                request.getIpdAdmissionId()
        );

        document.setInvoiceId(
                request.getInvoiceId()
        );

        document.setUpdatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        document.touch();


        SaasPatientDocument saved =
                documentRepository.save(
                        document
                );


        return toResponse(
                saved
        );
    }


    /*
     * ================================================================
     * DELETE
     * ================================================================
     */

    @Transactional
    public ApiResponse deleteDocument(
            Long tenantId,
            Long documentId
    ) {

        validateIds(
                tenantId,
                documentId
        );


        permissionService.requirePermission(
                tenantId,
                TenantModule.PATIENTS,
                SaasPermissionAction.DELETE
        );


        tenantAccessService.validateTenantAccess(
                tenantId
        );


        SaasPatientDocument document =
                findActiveDocument(
                        tenantId,
                        documentId
                );


        document.setActive(
                false
        );

        document.setUpdatedByAuthUserId(
                CurrentUserUtil.getUserId()
        );

        document.touch();


        documentRepository.save(
                document
        );


        return new ApiResponse(
                true,
                "Patient document deleted successfully"
        );
    }


    /*
     * ================================================================
     * VALIDATION
     * ================================================================
     */

    private void validateCreateRequest(
            SaasPatientDocumentRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Document request is required"
            );
        }


        if (request.getTenantId() == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (request.getPatientId() == null) {

            throw new RuntimeException(
                    "patientId is required"
            );
        }


        if (request.getDocumentType() == null) {

            throw new RuntimeException(
                    "Document type is required"
            );
        }


        if (
                request.getTitle() == null ||
                request.getTitle().isBlank()
        ) {

            throw new RuntimeException(
                    "Document title is required"
            );
        }


        if (
                request.getFileUrl() == null ||
                request.getFileUrl().isBlank()
        ) {

            throw new RuntimeException(
                    "Document file URL is required"
            );
        }


        normalizeFileSize(
                request.getFileSizeBytes()
        );
    }


    private void validateTenantAndPatientId(
            Long tenantId,
            Long patientId
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (patientId == null) {

            throw new RuntimeException(
                    "patientId is required"
            );
        }
    }


    private void validateIds(
            Long tenantId,
            Long documentId
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (documentId == null) {

            throw new RuntimeException(
                    "documentId is required"
            );
        }
    }


    private void validatePatient(
            Long tenantId,
            Long patientId
    ) {

        SaasPatient patient =
                patientRepository
                        .findByIdAndTenantIdAndActiveTrue(
                                patientId,
                                tenantId
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Patient not found"
                                        )
                        );


        if (
                patient.getActive() == null ||
                !patient.getActive()
        ) {

            throw new RuntimeException(
                    "Patient is not active"
            );
        }
    }


    private SaasPatientDocument findActiveDocument(
            Long tenantId,
            Long documentId
    ) {

        return documentRepository
                .findByIdAndTenantIdAndActiveTrue(
                        documentId,
                        tenantId
                )
                .orElseThrow(
                        () ->
                                new RuntimeException(
                                        "Patient document not found"
                                )
                );
    }


    private String cleanRequiredText(
            String value
    ) {

        if (
                value == null ||
                value.isBlank()
        ) {

            throw new RuntimeException(
                    "Required document field is missing"
            );
        }


        return value.trim();
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


    private String normalizeExtension(
            String extension
    ) {

        String clean =
                cleanText(
                        extension
                );


        if (clean == null) {

            return null;
        }


        if (clean.startsWith(".")) {

            clean =
                    clean.substring(1);
        }


        return clean.toLowerCase();
    }


    private Long normalizeFileSize(
            Long size
    ) {

        if (size == null) {

            return null;
        }


        if (size < 0) {

            throw new RuntimeException(
                    "Document file size cannot be negative"
            );
        }


        return size;
    }


    /*
     * ================================================================
     * RESPONSE MAPPING
     * ================================================================
     */

    private SaasPatientDocumentResponse toResponse(
            SaasPatientDocument document
    ) {

        return new SaasPatientDocumentResponse(

                document.getId(),

                document.getTenantId(),

                document.getPatientId(),

                document.getAppointmentId(),

                document.getPrescriptionId(),

                document.getDiagnosticOrderId(),

                document.getOpdVisitId(),

                document.getIpdAdmissionId(),

                document.getInvoiceId(),

                document.getDocumentType(),

                document.getTitle(),

                document.getFileName(),

                document.getFileUrl(),

                document.getMimeType(),

                document.getFileExtension(),

                document.getFileSizeBytes(),

                document.getDocumentDate(),

                document.getDescription(),

                document.getActive(),

                document.getCreatedAt(),

                document.getUpdatedAt()
        );
    }
}