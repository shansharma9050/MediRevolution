package com.example.medi.saas.controller;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasPatientDocumentRequest;
import com.example.medi.saas.dto.SaasPatientDocumentResponse;
import com.example.medi.saas.service.SaasPatientDocumentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/patient-documents")
public class SaasPatientDocumentController {

    private final SaasPatientDocumentService documentService;


    public SaasPatientDocumentController(
            SaasPatientDocumentService documentService
    ) {

        this.documentService =
                documentService;
    }


    @PostMapping
    public SaasPatientDocumentResponse createDocument(
            @RequestBody SaasPatientDocumentRequest request
    ) {

        return documentService.createDocument(
                request
        );
    }


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


    @DeleteMapping("/{documentId}")
    public ApiResponse deleteDocument(
            @PathVariable Long documentId,
            @RequestParam Long tenantId
    ) {

        return documentService.deleteDocument(
                tenantId,
                documentId
        );
    }
}