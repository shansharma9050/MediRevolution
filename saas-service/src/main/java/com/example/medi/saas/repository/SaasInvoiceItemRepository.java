package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasInvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasInvoiceItemRepository extends JpaRepository<SaasInvoiceItem, Long> {

    List<SaasInvoiceItem> findByTenantIdAndInvoiceIdOrderByIdAsc(
            Long tenantId,
            Long invoiceId
    );

    void deleteByTenantIdAndInvoiceId(Long tenantId, Long invoiceId);
}