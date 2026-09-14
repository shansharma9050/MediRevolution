package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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