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

    /*
     * ============================================================
     * PATIENT BASIC PROFILE
     * ============================================================
     */

    private SaasPatientResponse patient;


    /*
     * ============================================================
     * APPOINTMENT SUMMARY
     * ============================================================
     */

    private long appointmentCount;

    private AppointmentSnapshot latestAppointment;


    /*
     * ============================================================
     * PRESCRIPTION SUMMARY
     * ============================================================
     */

    private long prescriptionCount;

    private PrescriptionSnapshot latestPrescription;


    /*
     * ============================================================
     * CLINICAL SUMMARY
     * ============================================================
     */

    private VitalSnapshot latestVitals;

    private String latestDiagnosis;

    private LocalDate nextFollowUpDate;


    /*
     * ============================================================
     * PATIENT 360 CLINICAL OVERVIEW
     * ============================================================
     */

    private ClinicalOverview clinicalOverview;


    /*
     * ============================================================
     * MEDICATION HISTORY
     * ============================================================
     */

    private List<MedicationHistoryItem> medicationHistory;


    /*
     * ============================================================
     * INVESTIGATION / REPORT HISTORY
     * ============================================================
     */

    private List<InvestigationHistoryItem> investigationHistory;


    /*
     * ============================================================
     * LONGITUDINAL HEALTH TIMELINE
     * ============================================================
     */

    private List<TimelineItem> timeline;


    /*
     * ============================================================
     * APPOINTMENT SNAPSHOT
     * ============================================================
     */

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


    /*
     * ============================================================
     * PRESCRIPTION SNAPSHOT
     * ============================================================
     */

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


    /*
     * ============================================================
     * LATEST VITAL SNAPSHOT
     * ============================================================
     */

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


    /*
     * ============================================================
     * PATIENT 360 CLINICAL OVERVIEW
     * ============================================================
     */

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


    /*
     * ============================================================
     * MEDICATION HISTORY ITEM
     * ============================================================
     */

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


    /*
     * ============================================================
     * INVESTIGATION HISTORY ITEM
     * ============================================================
     */

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


    /*
     * ============================================================
     * INVESTIGATION TEST ITEM
     * ============================================================
     */

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
     * LONGITUDINAL TIMELINE ITEM
     * ============================================================
     */

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
}