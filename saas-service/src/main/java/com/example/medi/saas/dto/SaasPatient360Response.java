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

        /*
         * Number of completed / recorded OPD encounters.
         */
        private long opdVisitCount;

        /*
         * Number of IPD admission records.
         */
        private long ipdAdmissionCount;

        /*
         * Laboratory investigation orders.
         */
        private long labInvestigationCount;

        /*
         * Radiology investigation orders.
         */
        private long radiologyInvestigationCount;

        /*
         * Billing history.
         */
        private long invoiceCount;

        /*
         * Patient financial snapshot.
         */
        private BigDecimal totalBilledAmount;

        private BigDecimal totalPaidAmount;

        private BigDecimal totalOutstandingAmount;

        /*
         * Most recent clinical / healthcare activity from the
         * unified Patient 360 timeline.
         */
        private LocalDateTime lastClinicalActivityAt;
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

        /*
         * APPOINTMENT
         * PRESCRIPTION
         * OPD
         * IPD
         * LAB
         * RADIOLOGY
         * BILLING
         */
        private String type;

        /*
         * Primary record ID of the originating module.
         */
        private Long referenceId;

        /*
         * Actual date/time when the clinical/business event happened.
         */
        private LocalDateTime eventAt;

        private String title;

        private String subtitle;

        private String status;

        private String detail;

        /*
         * Populated where the event is related to an appointment.
         */
        private Long appointmentId;
    }
}