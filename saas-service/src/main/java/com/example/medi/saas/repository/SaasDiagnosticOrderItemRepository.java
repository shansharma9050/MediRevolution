package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasDiagnosticOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SaasDiagnosticOrderItemRepository
        extends JpaRepository<SaasDiagnosticOrderItem, Long> {

    List<SaasDiagnosticOrderItem> findByTenantIdAndOrderIdOrderByIdAsc(
            Long tenantId,
            Long orderId
    );

    List<SaasDiagnosticOrderItem> findByTenantIdAndOrderIdInOrderByOrderIdDescIdAsc(
            Long tenantId,
            Collection<Long> orderIds
    );

    void deleteByTenantId(Long tenantId);
}