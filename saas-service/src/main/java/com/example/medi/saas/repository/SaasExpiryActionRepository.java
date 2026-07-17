package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasExpiryAction;
import com.example.medi.saas.enums.SaasExpiryActionStatus;
import com.example.medi.saas.enums.SaasExpiryActionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaasExpiryActionRepository extends JpaRepository<SaasExpiryAction, Long> {

	List<SaasExpiryAction> findByTenantIdOrderByActionDateDescCreatedAtDesc(Long tenantId);

	Optional<SaasExpiryAction> findByIdAndTenantId(Long id, Long tenantId);

	List<SaasExpiryAction> findByTenantIdAndStockIdOrderByActionDateDescCreatedAtDesc(Long tenantId, Long stockId);

	List<SaasExpiryAction> findByTenantIdAndActionTypeOrderByActionDateDescCreatedAtDesc(Long tenantId,
			SaasExpiryActionType actionType);

	long countByTenantIdAndActionStatusNot(Long tenantId, SaasExpiryActionStatus actionStatus);

	@Query("""
			SELECT a
			FROM SaasExpiryAction a
			WHERE a.tenantId = :tenantId
			  AND (
			        LOWER(a.actionNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(a.medicineName)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(a.batchNumber)
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(a.supplierName, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(a.referenceNumber, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(a.purchaseReturnNumber, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY a.actionDate DESC, a.createdAt DESC
			""")
	List<SaasExpiryAction> searchActions(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	@Query("""
			SELECT COALESCE(SUM(a.stockValue), 0)
			FROM SaasExpiryAction a
			WHERE a.tenantId = :tenantId
			  AND a.actionType = :actionType
			  AND a.actionStatus <>
			      com.example.medi.saas.enums.SaasExpiryActionStatus.CANCELLED
			""")
	BigDecimal sumStockValueByActionType(@Param("tenantId") Long tenantId,

			@Param("actionType") SaasExpiryActionType actionType);

	@Query("""
			SELECT COALESCE(SUM(a.actionQuantity), 0)
			FROM SaasExpiryAction a
			WHERE a.tenantId = :tenantId
			  AND a.actionType = :actionType
			  AND a.actionStatus <>
			      com.example.medi.saas.enums.SaasExpiryActionStatus.CANCELLED
			""")
	Long sumQuantityByActionType(@Param("tenantId") Long tenantId,

			@Param("actionType") SaasExpiryActionType actionType);
}