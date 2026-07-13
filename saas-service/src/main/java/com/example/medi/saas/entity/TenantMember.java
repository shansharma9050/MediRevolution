package com.example.medi.saas.entity;

import com.example.medi.saas.enums.TenantMemberRole;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "saas_tenant_members",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"tenant_id", "auth_user_id"})
        }
)
@Data
public class TenantMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "auth_user_id", nullable = false)
    private Long authUserId;

    private String name;

    private String email;

    private String mobile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TenantMemberRole memberRole;

    private Boolean active = true;

    private LocalDateTime joinedAt = LocalDateTime.now();
}