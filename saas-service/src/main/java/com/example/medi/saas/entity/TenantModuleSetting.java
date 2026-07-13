package com.example.medi.saas.entity;

import com.example.medi.saas.enums.TenantModule;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(
        name = "saas_tenant_modules",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"tenant_id", "module"})
        }
)
@Data
public class TenantModuleSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TenantModule module;

    private Boolean enabled = true;
}