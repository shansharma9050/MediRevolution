package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_patient_merges",
        indexes = {
                @Index(
                        name = "idx_patient_merge_tenant_target",
                        columnList = "tenant_id,target_patient_id"
                ),
                @Index(
                        name = "idx_patient_merge_tenant_source",
                        columnList = "tenant_id,source_patient_id"
                ),
                @Index(
                        name = "idx_patient_merge_source_auth",
                        columnList = "tenant_id,source_auth_user_id"
                )
        }
)
@Data
public class SaasPatientMerge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "target_patient_id", nullable = false)
    private Long targetPatientId;

    @Column(name = "source_patient_id", nullable = false)
    private Long sourcePatientId;

    @Column(name = "source_auth_user_id")
    private Long sourceAuthUserId;

    @Column(name = "target_patient_code", length = 80)
    private String targetPatientCode;

    @Column(name = "target_patient_name", length = 160)
    private String targetPatientName;

    @Column(name = "source_patient_code", length = 80)
    private String sourcePatientCode;

    @Column(name = "source_patient_name", length = 160)
    private String sourcePatientName;

    @Column(nullable = false, length = 30)
    private String status = "MERGED";

    @Column(length = 1000)
    private String reason;

    @Lob
    @Column(name = "moved_record_snapshot_json")
    private String movedRecordSnapshotJson;

    @Column(name = "merged_by_auth_user_id")
    private Long mergedByAuthUserId;

    @Column(name = "merged_at", nullable = false)
    private LocalDateTime mergedAt = LocalDateTime.now();

    @Column(name = "unmerged_by_auth_user_id")
    private Long unmergedByAuthUserId;

    @Column(name = "unmerged_at")
    private LocalDateTime unmergedAt;
}