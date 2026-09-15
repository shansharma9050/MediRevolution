package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPatientDocumentType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_patient_documents",
        indexes = {
                @Index(
                        name = "idx_saas_patient_document_tenant_patient",
                        columnList = "tenantId,patientId"
                ),
                @Index(
                        name = "idx_saas_patient_document_type",
                        columnList = "tenantId,documentType"
                )
        }
)
@Data
public class SaasPatientDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * ============================================================
     * TENANT / PATIENT
     * ============================================================
     */

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
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
     * DOCUMENT INFORMATION
     * ============================================================
     */

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SaasPatientDocumentType documentType;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 255)
    private String fileName;

    @Column(nullable = false, length = 1000)
    private String fileUrl;

    @Column(length = 120)
    private String mimeType;

    @Column(length = 100)
    private String fileExtension;

    private Long fileSizeBytes;

    private LocalDate documentDate;

    @Column(length = 1000)
    private String description;


    /*
     * ============================================================
     * STATUS / AUDIT
     * ============================================================
     */

    @Column(nullable = false)
    private Boolean active = true;

    private Long createdByAuthUserId;

    private Long updatedByAuthUserId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;


    public void touch() {

        this.updatedAt =
                LocalDateTime.now();
    }
}