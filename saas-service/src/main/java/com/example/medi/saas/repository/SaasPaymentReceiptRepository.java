package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPaymentReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasPaymentReceiptRepository extends JpaRepository<SaasPaymentReceipt, Long> {

    List<SaasPaymentReceipt> findByTenantIdAndInvoiceIdOrderByReceiptDateTimeDesc(
            Long tenantId,
            Long invoiceId
    );
}