package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasWholesalerInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasWholesalerInvoiceRepository extends JpaRepository<SaasWholesalerInvoice, Long> {

	List<SaasWholesalerInvoice> findByTenantIdAndActiveTrueOrderByInvoiceDateTimeDesc(Long tenantId);

	Optional<SaasWholesalerInvoice> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

	List<SaasWholesalerInvoice> findByTenantIdAndCustomerIdAndActiveTrueOrderByInvoiceDateTimeDesc(Long tenantId,
			Long customerId);

	Optional<SaasWholesalerInvoice> findByInvoiceNumberAndTenantId(String invoiceNumber, Long tenantId);
	
	void deleteByTenantId(Long tenantId);

}