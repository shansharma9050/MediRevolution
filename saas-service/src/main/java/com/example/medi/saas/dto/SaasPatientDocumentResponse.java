package com.example.medi.saas.dto;

import com.example.medi.saas.enums.SaasPatientDocumentType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaasPatientDocumentResponse {

    private Long id;

    private Long tenantId;

    private Long patientId;

    private Long appointmentId;

    private Long prescriptionId;

    private Long diagnosticOrderId;

    private Long opdVisitId;

    private Long ipdAdmissionId;

    private Long invoiceId;

    private SaasPatientDocumentType documentType;

    private String title;

    private String fileName;

    private String fileUrl;

    private String mimeType;

    private String fileExtension;

    private Long fileSizeBytes;

    private LocalDate documentDate;

    private String description;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}