package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_tenant_member_permissions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saas_member_module_action",
                        columnNames = {"tenantId", "authUserId", "module", "permissionAction"}
                )
        }
)
@Data
public class SaasTenantMemberPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tenant / workspace isolation.
     */
    @Column(nullable = false)
    private Long tenantId;

    /*
     * Auth user id of tenant member.
     */
    @Column(nullable = false)
    private Long authUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TenantModule module;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasPermissionAction permissionAction;

    private Boolean allowed = true;

    private Long grantedByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}