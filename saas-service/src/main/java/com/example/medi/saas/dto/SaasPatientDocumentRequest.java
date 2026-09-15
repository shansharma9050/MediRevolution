package com.example.medi.saas.dto;

import com.example.medi.saas.enums.SaasPatientDocumentType;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SaasPatientDocumentRequest {

    /*
     * ============================================================
     * REQUIRED OWNERSHIP
     * ============================================================
     */

    private Long tenantId;

    private Long patientId;


    /*
     * ============================================================
     * OPTIONAL CLINICAL REFERENCES
     * ============================================================
     */

    private Long appointmentId;

    private Long prescriptionId;

    private Long diagnosticOrderId;

    private Long opdVisitId;

    private Long ipdAdmissionId;

    private Long invoiceId;


    /*
     * ============================================================
     * DOCUMENT DETAILS
     * ============================================================
     */

    private SaasPatientDocumentType documentType;

    private String title;

    private String fileName;

    private String fileUrl;

    private String mimeType;

    private String fileExtension;

    private Long fileSizeBytes;

    private LocalDate documentDate;

    private String description;
}