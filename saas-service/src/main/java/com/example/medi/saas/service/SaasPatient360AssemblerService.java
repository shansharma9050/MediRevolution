package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasPatient360Response;
import com.example.medi.saas.dto.SaasPatientAllergyResponse;
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

    private final SaasPatientAllergyService patientAllergyService;


    public SaasPatient360AssemblerService(
            SaasPatientService patientService,
            SaasPatientDocumentService patientDocumentService,
            SaasPatientAllergyService patientAllergyService
    ) {

        this.patientService =
                patientService;

        this.patientDocumentService =
                patientDocumentService;

        this.patientAllergyService =
                patientAllergyService;
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


        /*
         * ============================================================
         * DOCUMENT VAULT
         * ============================================================
         */

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


        /*
         * ============================================================
         * STRUCTURED ALLERGIES
         * ============================================================
         */

        List<SaasPatientAllergyResponse> allergies =
                patientAllergyService.getPatientAllergies(
                        tenantId,
                        patientId
                );


        List<SaasPatient360Response.AllergyHistoryItem> allergyHistory =
                buildAllergyHistory(
                        allergies
                );


        response.setAllergyHistory(
                allergyHistory
        );


        /*
         * ============================================================
         * TIMELINE
         * ============================================================
         */

        List<SaasPatient360Response.TimelineItem> timeline =
                new ArrayList<>();


        if (response.getTimeline() != null) {

            timeline.addAll(
                    response.getTimeline()
            );
        }


        mergeDocumentTimeline(
                timeline,
                documents
        );


        mergeAllergyTimeline(
                timeline,
                allergies
        );


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
     * STRUCTURED ALLERGY HISTORY
     * ================================================================
     */

    private List<SaasPatient360Response.AllergyHistoryItem>
            buildAllergyHistory(
                    List<SaasPatientAllergyResponse> allergies
            ) {

        if (
                allergies == null ||
                allergies.isEmpty()
        ) {

            return List.of();
        }


        List<SaasPatient360Response.AllergyHistoryItem> history =
                new ArrayList<>();


        for (
                SaasPatientAllergyResponse allergy
                        : allergies
        ) {

            history.add(
                    new SaasPatient360Response.AllergyHistoryItem(

                            allergy.getId(),

                            allergy.getAllergen(),

                            allergy.getAllergyType(),

                            allergy.getReaction(),

                            allergy.getSeverity() == null
                                    ? null
                                    : allergy
                                            .getSeverity()
                                            .name(),

                            allergy.getStatus() == null
                                    ? null
                                    : allergy
                                            .getStatus()
                                            .name(),

                            allergy.getOnsetDate(),

                            allergy.getNotes(),

                            allergy.getCreatedAt(),

                            allergy.getUpdatedAt()
                    )
            );
        }


        history.sort(

                Comparator.comparing(

                        SaasPatient360Response
                                .AllergyHistoryItem
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
     * ALLERGY TIMELINE
     * ================================================================
     */

    private void mergeAllergyTimeline(
            List<SaasPatient360Response.TimelineItem> timeline,
            List<SaasPatientAllergyResponse> allergies
    ) {

        if (
                timeline == null ||
                allergies == null ||
                allergies.isEmpty()
        ) {

            return;
        }


        for (
                SaasPatientAllergyResponse allergy
                        : allergies
        ) {

            String severity =
                    allergy.getSeverity() == null
                            ? "UNKNOWN"
                            : allergy
                                    .getSeverity()
                                    .name();


            String status =
                    allergy.getStatus() == null
                            ? null
                            : allergy
                                    .getStatus()
                                    .name();


            String subtitle =
                    firstNonBlank(
                            allergy.getAllergen(),
                            allergy.getAllergyType(),
                            "Patient allergy"
                    );


            String detail =
                    buildAllergyDetail(
                            allergy
                    );


            LocalDateTime eventAt =
                    resolveAllergyEventDateTime(
                            allergy
                    );


            timeline.add(
                    new SaasPatient360Response.TimelineItem(

                            "ALLERGY",

                            allergy.getId(),

                            eventAt,

                            "Allergy Record",

                            subtitle,

                            status == null
                                    ? severity
                                    : status,

                            detail,

                            null
                    )
            );
        }
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

    private void mergeDocumentTimeline(
            List<SaasPatient360Response.TimelineItem> timeline,
            List<SaasPatientDocumentResponse> documents
    ) {

        if (
                timeline == null ||
                documents == null ||
                documents.isEmpty()
        ) {

            return;
        }


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
                response.getClinicalOverview() == null ||
                timeline == null
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
     * ALLERGY HELPERS
     * ================================================================
     */

    private LocalDateTime resolveAllergyEventDateTime(
            SaasPatientAllergyResponse allergy
    ) {

        if (
                allergy.getOnsetDate() != null
        ) {

            return allergy
                    .getOnsetDate()
                    .atTime(
                            LocalTime.NOON
                    );
        }


        if (
                allergy.getUpdatedAt() != null
        ) {

            return allergy.getUpdatedAt();
        }


        return allergy.getCreatedAt();
    }


    private String buildAllergyDetail(
            SaasPatientAllergyResponse allergy
    ) {

        List<String> parts =
                new ArrayList<>();


        if (
                allergy.getSeverity() != null
        ) {

            parts.add(
                    "Severity: "
                            + formatEnumLabel(
                                    allergy
                                            .getSeverity()
                                            .name()
                            )
            );
        }


        if (
                hasText(
                        allergy.getReaction()
                )
        ) {

            parts.add(
                    "Reaction: "
                            + allergy
                                    .getReaction()
                                    .trim()
            );
        }


        if (
                hasText(
                        allergy.getNotes()
                )
        ) {

            parts.add(
                    allergy
                            .getNotes()
                            .trim()
            );
        }


        if (parts.isEmpty()) {

            return "Structured patient allergy";
        }


        return String.join(
                " • ",
                parts
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
                hasText(
                        document.getDescription()
                )
        ) {

            parts.add(
                    document
                            .getDescription()
                            .trim()
            );
        }


        if (
                hasText(
                        document.getFileName()
                )
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

            String size =
                    formatFileSize(
                            document.getFileSizeBytes()
                    );


            if (size != null) {

                parts.add(
                        size
                );
            }
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


    /*
     * ================================================================
     * GENERAL HELPERS
     * ================================================================
     */

    private boolean hasText(
            String value
    ) {

        return value != null &&
                !value.isBlank();
    }


    private String formatEnumLabel(
            String value
    ) {

        if (
                value == null ||
                value.isBlank()
        ) {

            return "";
        }


        String normalized =
                value
                        .trim()
                        .toLowerCase()
                        .replace(
                                '_',
                                ' '
                        );


        String[] words =
                normalized.split(
                        "\\s+"
                );


        StringBuilder result =
                new StringBuilder();


        for (
                String word
                        : words
        ) {

            if (word.isBlank()) {

                continue;
            }


            if (!result.isEmpty()) {

                result.append(' ');
            }


            result.append(
                    Character.toUpperCase(
                            word.charAt(0)
                    )
            );


            if (word.length() > 1) {

                result.append(
                        word.substring(1)
                );
            }
        }


        return result.toString();
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