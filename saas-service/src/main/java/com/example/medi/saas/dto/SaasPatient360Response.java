package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaasPatient360Response {

    private SaasPatientResponse patient;

    private long appointmentCount;

    private AppointmentSnapshot latestAppointment;

    private long prescriptionCount;

    private PrescriptionSnapshot latestPrescription;

    private VitalSnapshot latestVitals;

    private String latestDiagnosis;

    private LocalDate nextFollowUpDate;

    private ClinicalOverview clinicalOverview;

    private List<MedicationHistoryItem> medicationHistory;

    private List<InvestigationHistoryItem> investigationHistory;

    /*
     * ============================================================
     * STRUCTURED ALLERGY HISTORY
     * ============================================================
     */

    private List<AllergyHistoryItem> allergyHistory;

    /*
     * ============================================================
     * DOCUMENT VAULT
     * ============================================================
     */

    private List<DocumentHistoryItem> documentHistory;

    private List<TimelineItem> timeline;


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AppointmentSnapshot {

        private Long appointmentId;

        private String doctorName;

        private String department;

        private String specialization;

        private LocalDate appointmentDate;

        private LocalTime appointmentTime;

        private String appointmentType;

        private String status;

        private String symptoms;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrescriptionSnapshot {

        private Long prescriptionId;

        private Long appointmentId;

        private String diagnosis;

        private String clinicalNotes;

        private String advice;

        private String labTests;

        private String followUpAdvice;

        private LocalDate followUpDate;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VitalSnapshot {

        private String bloodPressure;

        private String pulse;

        private String temperature;

        private String spo2;

        private String weight;

        private String height;

        private String sugarLevel;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClinicalOverview {

        private long opdVisitCount;

        private long ipdAdmissionCount;

        private long labInvestigationCount;

        private long radiologyInvestigationCount;

        private long invoiceCount;

        private BigDecimal totalBilledAmount;

        private BigDecimal totalPaidAmount;

        private BigDecimal totalOutstandingAmount;

        private LocalDateTime lastClinicalActivityAt;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MedicationHistoryItem {

        private Long prescriptionId;

        private Long appointmentId;

        private LocalDateTime prescribedAt;

        private String diagnosis;

        private String medicineName;

        private String dosage;

        private String frequency;

        private String duration;

        private String instructions;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvestigationHistoryItem {

        private Long orderId;

        private String orderNumber;

        private String diagnosticType;

        private String status;

        private Long appointmentId;

        private Long prescriptionId;

        private LocalDateTime orderedAt;

        private LocalDateTime sampleCollectedAt;

        private LocalDateTime reportReadyAt;

        private String clinicalNotes;

        private String resultSummary;

        private String resultDetails;

        private String reportFileUrl;

        private List<InvestigationTestItem> tests;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvestigationTestItem {

        private Long testId;

        private String testName;

        private String testCode;

        private BigDecimal price;
    }


    /*
     * ============================================================
     * ALLERGY HISTORY ITEM
     * ============================================================
     */

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllergyHistoryItem {

        private Long allergyId;

        private String allergen;

        private String allergyType;

        private String reaction;

        private String severity;

        private String status;

        private LocalDate onsetDate;

        private String notes;

        private LocalDateTime createdAt;

        private LocalDateTime updatedAt;
    }


    /*
     * ============================================================
     * DOCUMENT HISTORY ITEM
     * ============================================================
     */

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentHistoryItem {

        private Long documentId;

        private String documentType;

        private String title;

        private String fileName;

        private String mimeType;

        private String fileExtension;

        private Long fileSizeBytes;

        private LocalDate documentDate;

        private String description;

        private Long appointmentId;

        private Long prescriptionId;

        private Long diagnosticOrderId;

        private Long opdVisitId;

        private Long ipdAdmissionId;

        private Long invoiceId;

        private LocalDateTime createdAt;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimelineItem {

        private String type;

        private Long referenceId;

        private LocalDateTime eventAt;

        private String title;

        private String subtitle;

        private String status;

        private String detail;

        private Long appointmentId;
    }


    /*
     * ============================================================
     * BACKWARD-COMPATIBLE CONSTRUCTOR
     * Existing SaasPatientService still creates the base Patient 360.
     * ============================================================
     */

    public SaasPatient360Response(
            SaasPatientResponse patient,
            long appointmentCount,
            AppointmentSnapshot latestAppointment,
            long prescriptionCount,
            PrescriptionSnapshot latestPrescription,
            VitalSnapshot latestVitals,
            String latestDiagnosis,
            LocalDate nextFollowUpDate,
            ClinicalOverview clinicalOverview,
            List<MedicationHistoryItem> medicationHistory,
            List<InvestigationHistoryItem> investigationHistory,
            List<TimelineItem> timeline
    ) {

        this.patient =
                patient;

        this.appointmentCount =
                appointmentCount;

        this.latestAppointment =
                latestAppointment;

        this.prescriptionCount =
                prescriptionCount;

        this.latestPrescription =
                latestPrescription;

        this.latestVitals =
                latestVitals;

        this.latestDiagnosis =
                latestDiagnosis;

        this.nextFollowUpDate =
                nextFollowUpDate;

        this.clinicalOverview =
                clinicalOverview;

        this.medicationHistory =
                medicationHistory;

        this.investigationHistory =
                investigationHistory;

        this.allergyHistory =
                List.of();

        this.documentHistory =
                List.of();

        this.timeline =
                timeline;
    }
}