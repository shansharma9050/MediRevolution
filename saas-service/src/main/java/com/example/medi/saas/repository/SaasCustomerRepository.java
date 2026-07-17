package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasCustomer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SaasCustomerRepository extends JpaRepository<SaasCustomer, Long> {

	List<SaasCustomer> findByTenantIdOrderByCustomerNameAsc(Long tenantId);

	List<SaasCustomer> findByTenantIdAndActiveTrueOrderByCustomerNameAsc(Long tenantId);

	Optional<SaasCustomer> findByIdAndTenantId(Long id, Long tenantId);

	Optional<SaasCustomer> findByTenantIdAndCustomerCodeIgnoreCase(Long tenantId, String customerCode);

	Optional<SaasCustomer> findByTenantIdAndCustomerCodeIgnoreCaseAndIdNot(Long tenantId, String customerCode, Long id);

	Optional<SaasCustomer> findByTenantIdAndGstinIgnoreCase(Long tenantId, String gstin);

	Optional<SaasCustomer> findByTenantIdAndGstinIgnoreCaseAndIdNot(Long tenantId, String gstin, Long id);

	long countByTenantId(Long tenantId);

	long countByTenantIdAndActiveTrue(Long tenantId);

	@Query("""
			SELECT c
			FROM SaasCustomer c
			WHERE c.tenantId = :tenantId
			  AND (
			        LOWER(c.customerCode)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(c.customerName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.customerType, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.contactPersonName, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.mobile, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.alternateMobile, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.email, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.gstin, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.city, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(c.state, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY c.customerName ASC
			""")
	List<SaasCustomer> searchCustomers(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);
}