package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasWholesalerInvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasWholesalerInvoiceItemRepository extends JpaRepository<SaasWholesalerInvoiceItem, Long> {

	List<SaasWholesalerInvoiceItem> findByTenantIdAndInvoiceIdOrderByIdAsc(Long tenantId, Long invoiceId);

	List<SaasWholesalerInvoiceItem> findByTenantIdAndMedicineId(Long tenantId, Long medicineId);

	void deleteByInvoiceId(Long invoiceId);

}