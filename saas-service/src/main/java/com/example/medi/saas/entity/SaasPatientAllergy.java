package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasAllergySeverity;
import com.example.medi.saas.enums.SaasAllergyStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_patient_allergies",
        indexes = {
                @Index(
                        name = "idx_saas_patient_allergy_tenant_patient",
                        columnList = "tenantId,patientId"
                ),
                @Index(
                        name = "idx_saas_patient_allergy_status",
                        columnList = "tenantId,status"
                )
        }
)
@Data
public class SaasPatientAllergy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    /*
     * ============================================================
     * OWNERSHIP
     * ============================================================
     */

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long patientId;


    /*
     * ============================================================
     * ALLERGY INFORMATION
     * ============================================================
     */

    @Column(nullable = false, length = 160)
    private String allergen;

    @Column(length = 80)
    private String allergyType;

    @Column(length = 500)
    private String reaction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SaasAllergySeverity severity =
            SaasAllergySeverity.UNKNOWN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SaasAllergyStatus status =
            SaasAllergyStatus.ACTIVE;

    private LocalDate onsetDate;

    @Column(length = 1000)
    private String notes;


    /*
     * ============================================================
     * AUDIT
     * ============================================================
     */

    @Column(nullable = false)
    private Boolean active = true;

    private Long createdByAuthUserId;

    private Long updatedByAuthUserId;

    @Column(nullable = false)
    private LocalDateTime createdAt =
            LocalDateTime.now();

    private LocalDateTime updatedAt;


    public void touch() {

        this.updatedAt =
                LocalDateTime.now();
    }
}