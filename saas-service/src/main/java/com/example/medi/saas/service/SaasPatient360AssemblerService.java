package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasPatient360Response;
import com.example.medi.saas.dto.SaasPatientDocumentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class SaasPatient360AssemblerService {

    private final SaasPatientService patientService;

    private final SaasPatientDocumentService patientDocumentService;


    public SaasPatient360AssemblerService(
            SaasPatientService patientService,
            SaasPatientDocumentService patientDocumentService
    ) {

        this.patientService =
                patientService;

        this.patientDocumentService =
                patientDocumentService;
    }


    /*
     * ================================================================
     * COMPLETE PATIENT 360
     * ================================================================
     */

    @Transactional(readOnly = true)
    public SaasPatient360Response getPatient360(
            Long tenantId,
            Long patientId
    ) {

        SaasPatient360Response response =
                patientService.getPatient360(
                        tenantId,
                        patientId
                );


        List<SaasPatientDocumentResponse> documents =
                patientDocumentService.getPatientDocuments(
                        tenantId,
                        patientId
                );


        List<SaasPatient360Response.DocumentHistoryItem> documentHistory =
                buildDocumentHistory(
                        documents
                );


        response.setDocumentHistory(
                documentHistory
        );


        List<SaasPatient360Response.TimelineItem> timeline =
                mergeDocumentTimeline(
                        response.getTimeline(),
                        documents
                );


        response.setTimeline(
                timeline
        );


        updateLastClinicalActivity(
                response,
                timeline
        );


        return response;
    }


    /*
     * ================================================================
     * DOCUMENT HISTORY
     * ================================================================
     */

    private List<SaasPatient360Response.DocumentHistoryItem>
            buildDocumentHistory(
                    List<SaasPatientDocumentResponse> documents
            ) {

        if (
                documents == null ||
                documents.isEmpty()
        ) {

            return List.of();
        }


        List<SaasPatient360Response.DocumentHistoryItem> history =
                new ArrayList<>();


        for (
                SaasPatientDocumentResponse document
                        : documents
        ) {

            history.add(
                    new SaasPatient360Response.DocumentHistoryItem(

                            document.getId(),

                            document.getDocumentType() == null
                                    ? null
                                    : document
                                            .getDocumentType()
                                            .name(),

                            document.getTitle(),

                            document.getFileName(),

                            document.getMimeType(),

                            document.getFileExtension(),

                            document.getFileSizeBytes(),

                            document.getDocumentDate(),

                            document.getDescription(),

                            document.getAppointmentId(),

                            document.getPrescriptionId(),

                            document.getDiagnosticOrderId(),

                            document.getOpdVisitId(),

                            document.getIpdAdmissionId(),

                            document.getInvoiceId(),

                            document.getCreatedAt()
                    )
            );
        }


        history.sort(

                Comparator.comparing(

                        SaasPatient360Response
                                .DocumentHistoryItem
                                ::getCreatedAt,

                        Comparator.nullsLast(
                                Comparator.reverseOrder()
                        )
                )
        );


        return history;
    }


    /*
     * ================================================================
     * DOCUMENT TIMELINE
     * ================================================================
     */

    private List<SaasPatient360Response.TimelineItem>
            mergeDocumentTimeline(
                    List<SaasPatient360Response.TimelineItem> existingTimeline,
                    List<SaasPatientDocumentResponse> documents
            ) {

        List<SaasPatient360Response.TimelineItem> timeline =
                new ArrayList<>();


        if (existingTimeline != null) {

            timeline.addAll(
                    existingTimeline
            );
        }


        if (documents != null) {

            for (
                    SaasPatientDocumentResponse document
                            : documents
            ) {

                LocalDateTime eventAt =
                        resolveDocumentEventDateTime(
                                document
                        );


                String documentType =
                        document.getDocumentType() == null
                                ? "DOCUMENT"
                                : document
                                        .getDocumentType()
                                        .name();


                String subtitle =
                        firstNonBlank(
                                document.getTitle(),
                                document.getFileName(),
                                documentType
                        );


                String detail =
                        buildDocumentDetail(
                                document
                        );


                timeline.add(
                        new SaasPatient360Response.TimelineItem(

                                "DOCUMENT",

                                document.getId(),

                                eventAt,

                                "Patient Document",

                                subtitle,

                                documentType,

                                detail,

                                document.getAppointmentId()
                        )
                );
            }
        }


        timeline.sort(

                Comparator.comparing(

                        SaasPatient360Response
                                .TimelineItem
                                ::getEventAt,

                        Comparator.nullsLast(
                                Comparator.reverseOrder()
                        )
                )
        );


        return timeline;
    }


    /*
     * ================================================================
     * LAST PATIENT 360 ACTIVITY
     * ================================================================
     */

    private void updateLastClinicalActivity(
            SaasPatient360Response response,
            List<SaasPatient360Response.TimelineItem> timeline
    ) {

        if (
                response == null ||
                response.getClinicalOverview() == null
        ) {

            return;
        }


        LocalDateTime lastActivity =
                timeline
                        .stream()
                        .map(
                                SaasPatient360Response
                                        .TimelineItem
                                        ::getEventAt
                        )
                        .filter(
                                value ->
                                        value != null
                        )
                        .max(
                                LocalDateTime::compareTo
                        )
                        .orElse(null);


        response
                .getClinicalOverview()
                .setLastClinicalActivityAt(
                        lastActivity
                );
    }


    /*
     * ================================================================
     * DOCUMENT HELPERS
     * ================================================================
     */

    private LocalDateTime resolveDocumentEventDateTime(
            SaasPatientDocumentResponse document
    ) {

        if (
                document.getDocumentDate() != null
        ) {

            return document
                    .getDocumentDate()
                    .atTime(
                            LocalTime.NOON
                    );
        }


        return document.getCreatedAt();
    }


    private String buildDocumentDetail(
            SaasPatientDocumentResponse document
    ) {

        List<String> parts =
                new ArrayList<>();


        if (
                document.getDescription() != null &&
                !document
                        .getDescription()
                        .isBlank()
        ) {

            parts.add(
                    document
                            .getDescription()
                            .trim()
            );
        }


        if (
                document.getFileName() != null &&
                !document
                        .getFileName()
                        .isBlank()
        ) {

            parts.add(
                    document
                            .getFileName()
                            .trim()
            );
        }


        if (
                document.getFileSizeBytes() != null
        ) {

            parts.add(
                    formatFileSize(
                            document.getFileSizeBytes()
                    )
            );
        }


        if (parts.isEmpty()) {

            return "Patient document";
        }


        return String.join(
                " • ",
                parts
        );
    }


    private String formatFileSize(
            Long bytes
    ) {

        if (
                bytes == null ||
                bytes < 0
        ) {

            return null;
        }


        if (bytes < 1024) {

            return bytes
                    + " B";
        }


        double kilobytes =
                bytes / 1024.0;


        if (kilobytes < 1024) {

            return String.format(
                    "%.1f KB",
                    kilobytes
            );
        }


        double megabytes =
                kilobytes / 1024.0;


        return String.format(
                "%.1f MB",
                megabytes
        );
    }


    private String firstNonBlank(
            String... values
    ) {

        if (values == null) {

            return null;
        }


        for (
                String value
                        : values
        ) {

            if (
                    value != null &&
                    !value.isBlank()
            ) {

                return value.trim();
            }
        }


        return null;
    }
}