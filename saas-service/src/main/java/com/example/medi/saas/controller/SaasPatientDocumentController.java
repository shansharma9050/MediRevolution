package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatientDocumentRequest;
import com.example.medi.saas.dto.SaasPatientDocumentResponse;
import com.example.medi.saas.enums.SaasPatientDocumentType;
import com.example.medi.saas.service.SaasPatientDocumentService;
import com.example.medi.saas.service.SaasPatientDocumentStorageService;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/saas/patient-documents")
public class SaasPatientDocumentController {

    private final SaasPatientDocumentService documentService;

    private final SaasPatientDocumentStorageService storageService;


    public SaasPatientDocumentController(
            SaasPatientDocumentService documentService,
            SaasPatientDocumentStorageService storageService
    ) {

        this.documentService =
                documentService;

        this.storageService =
                storageService;
    }


    /*
     * ================================================================
     * CREATE DOCUMENT METADATA
     * ================================================================
     */

    @PostMapping
    public SaasPatientDocumentResponse createDocument(
            @RequestBody SaasPatientDocumentRequest request
    ) {

        return documentService.createDocument(
                request
        );
    }


    /*
     * ================================================================
     * SECURE FILE UPLOAD + DOCUMENT CREATION
     * ================================================================
     */

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public SaasPatientDocumentResponse uploadDocument(

            @RequestParam Long tenantId,

            @RequestParam Long patientId,

            @RequestParam SaasPatientDocumentType documentType,

            @RequestParam String title,

            @RequestParam(required = false)
            Long appointmentId,

            @RequestParam(required = false)
            Long prescriptionId,

            @RequestParam(required = false)
            Long diagnosticOrderId,

            @RequestParam(required = false)
            Long opdVisitId,

            @RequestParam(required = false)
            Long ipdAdmissionId,

            @RequestParam(required = false)
            Long invoiceId,

            @RequestParam(required = false)
            LocalDate documentDate,

            @RequestParam(required = false)
            String description,

            @RequestPart("file")
            MultipartFile file
    ) {

        SaasPatientDocumentStorageService.StoredDocumentFile storedFile =
                storageService.store(
                        tenantId,
                        patientId,
                        file
                );


        try {

            SaasPatientDocumentRequest request =
                    new SaasPatientDocumentRequest();


            request.setTenantId(
                    tenantId
            );

            request.setPatientId(
                    patientId
            );

            request.setAppointmentId(
                    appointmentId
            );

            request.setPrescriptionId(
                    prescriptionId
            );

            request.setDiagnosticOrderId(
                    diagnosticOrderId
            );

            request.setOpdVisitId(
                    opdVisitId
            );

            request.setIpdAdmissionId(
                    ipdAdmissionId
            );

            request.setInvoiceId(
                    invoiceId
            );

            request.setDocumentType(
                    documentType
            );

            request.setTitle(
                    title
            );

            request.setFileName(
                    storedFile.originalFileName()
            );

            /*
             * Private internal storage key.
             */
            request.setFileUrl(
                    storedFile.storageKey()
            );

            request.setMimeType(
                    storedFile.mimeType()
            );

            request.setFileExtension(
                    storedFile.extension()
            );

            request.setFileSizeBytes(
                    storedFile.fileSizeBytes()
            );

            request.setDocumentDate(
                    documentDate
            );

            request.setDescription(
                    description
            );


            return documentService.createDocument(
                    request
            );


        } catch (RuntimeException exception) {

            storageService.deleteIfManaged(
                    storedFile.storageKey()
            );


            throw exception;
        }
    }


    /*
     * ================================================================
     * PATIENT DOCUMENT LIST
     * ================================================================
     */

    @GetMapping("/patient/{patientId}")
    public List<SaasPatientDocumentResponse> getPatientDocuments(
            @PathVariable Long patientId,
            @RequestParam Long tenantId
    ) {

        return documentService.getPatientDocuments(
                tenantId,
                patientId
        );
    }


    /*
     * ================================================================
     * DOCUMENT METADATA
     * ================================================================
     */

    @GetMapping("/{documentId}")
    public SaasPatientDocumentResponse getDocument(
            @PathVariable Long documentId,
            @RequestParam Long tenantId
    ) {

        return documentService.getDocument(
                tenantId,
                documentId
        );
    }


    /*
     * ================================================================
     * SECURE DOCUMENT DOWNLOAD
     * ================================================================
     */

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Long documentId,
            @RequestParam Long tenantId
    ) {

        SaasPatientDocumentResponse document =
                documentService.getDocument(
                        tenantId,
                        documentId
                );


        Resource resource =
                storageService.loadAsResource(
                        document.getFileUrl()
                );


        MediaType mediaType =
                resolveMediaType(
                        document.getMimeType()
                );


        String fileName =
                resolveDownloadFileName(
                        document
                );


        ContentDisposition contentDisposition =
                ContentDisposition
                        .attachment()
                        .filename(
                                fileName,
                                StandardCharsets.UTF_8
                        )
                        .build();


        return ResponseEntity
                .ok()
                .contentType(
                        mediaType
                )
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        contentDisposition.toString()
                )
                .header(
                        "X-Content-Type-Options",
                        "nosniff"
                )
                .header(
                        HttpHeaders.CACHE_CONTROL,
                        "no-store, no-cache, must-revalidate"
                )
                .header(
                        HttpHeaders.PRAGMA,
                        "no-cache"
                )
                .body(
                        resource
                );
    }


    /*
     * ================================================================
     * UPDATE DOCUMENT METADATA
     * ================================================================
     */

    @PutMapping("/{documentId}")
    public SaasPatientDocumentResponse updateDocument(
            @PathVariable Long documentId,
            @RequestParam Long tenantId,
            @RequestBody SaasPatientDocumentRequest request
    ) {

        return documentService.updateDocument(
                tenantId,
                documentId,
                request
        );
    }


    /*
     * ================================================================
     * DELETE DOCUMENT + PHYSICAL FILE
     * ================================================================
     */

    @DeleteMapping("/{documentId}")
    public ApiResponse deleteDocument(
            @PathVariable Long documentId,
            @RequestParam Long tenantId
    ) {

        SaasPatientDocumentResponse document =
                documentService.getDocument(
                        tenantId,
                        documentId
                );


        ApiResponse response =
                documentService.deleteDocument(
                        tenantId,
                        documentId
                );


        storageService.deleteIfManaged(
                document.getFileUrl()
        );


        return response;
    }


    /*
     * ================================================================
     * HELPERS
     * ================================================================
     */

    private MediaType resolveMediaType(
            String mimeType
    ) {

        if (
                mimeType == null ||
                mimeType.isBlank()
        ) {

            return MediaType.APPLICATION_OCTET_STREAM;
        }


        try {

            return MediaType.parseMediaType(
                    mimeType
            );


        } catch (IllegalArgumentException exception) {

            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }


    private String resolveDownloadFileName(
            SaasPatientDocumentResponse document
    ) {

        if (
                document.getFileName() != null &&
                !document
                        .getFileName()
                        .isBlank()
        ) {

            return document
                    .getFileName()
                    .trim();
        }


        String extension =
                document.getFileExtension();


        if (
                extension == null ||
                extension.isBlank()
        ) {

            return "patient-document";
        }


        return "patient-document."
                + extension.trim();
    }
}