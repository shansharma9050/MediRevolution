package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasMedicineStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SaasMedicineStockRepository extends JpaRepository<SaasMedicineStock, Long> {

	List<SaasMedicineStock> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId);

	List<SaasMedicineStock> findByTenantIdAndMedicineIdAndActiveTrueOrderByExpiryDateAsc(Long tenantId,
			Long medicineId);

	List<SaasMedicineStock> findByTenantIdAndMedicineIdAndCurrentQuantityGreaterThanAndActiveTrueOrderByExpiryDateAsc(
			Long tenantId, Long medicineId, Integer currentQuantity);

	Optional<SaasMedicineStock> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);

	Optional<SaasMedicineStock> findByTenantIdAndMedicineIdAndBatchNumberIgnoreCaseAndActiveTrue(Long tenantId,
			Long medicineId, String batchNumber);

	List<SaasMedicineStock> findByTenantIdAndLastPurchaseIdAndActiveTrue(Long tenantId, Long lastPurchaseId);

	List<SaasMedicineStock> findByTenantIdAndActiveTrueAndExpiryDateBeforeOrderByExpiryDateAsc(Long tenantId,
			LocalDate expiryDate);

	List<SaasMedicineStock> findByTenantIdAndActiveTrueAndExpiryDateBetweenOrderByExpiryDateAsc(Long tenantId,
			LocalDate startDate, LocalDate endDate);

	long countByTenantIdAndActiveTrue(Long tenantId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
			SELECT s
			FROM SaasMedicineStock s
			WHERE s.tenantId = :tenantId
			  AND s.medicineId = :medicineId
			  AND s.active = true
			  AND COALESCE(s.currentQuantity, 0) > 0
			  AND (
			        s.expiryDate IS NULL
			        OR s.expiryDate >= :today
			  )
			ORDER BY
			    CASE
			        WHEN s.expiryDate IS NULL THEN 1
			        ELSE 0
			    END ASC,
			    s.expiryDate ASC,
			    s.createdAt ASC
			""")
	List<SaasMedicineStock> findAvailableBatchesForSale(@Param("tenantId") Long tenantId,

			@Param("medicineId") Long medicineId,

			@Param("today") LocalDate today);

	@Query("""
			SELECT COALESCE(SUM(s.currentQuantity), 0)
			FROM SaasMedicineStock s
			WHERE s.tenantId = :tenantId
			  AND s.active = true
			""")
	Long sumCurrentQuantity(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(
			    SUM(
			        COALESCE(s.currentQuantity, 0)
			        * COALESCE(s.purchasePrice, 0)
			    ),
			    0
			)
			FROM SaasMedicineStock s
			WHERE s.tenantId = :tenantId
			  AND s.active = true
			""")
	BigDecimal sumPurchaseValue(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT COALESCE(
			    SUM(
			        COALESCE(s.currentQuantity, 0)
			        * COALESCE(s.salePrice, 0)
			    ),
			    0
			)
			FROM SaasMedicineStock s
			WHERE s.tenantId = :tenantId
			  AND s.active = true
			""")
	BigDecimal sumSaleValue(@Param("tenantId") Long tenantId);

	@Query("""
			SELECT s
			FROM SaasMedicineStock s
			WHERE s.tenantId = :tenantId
			  AND s.active = true
			  AND (
			        LOWER(COALESCE(s.batchNumber, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR LOWER(COALESCE(s.supplierName, ''))
			            LIKE LOWER(CONCAT('%', :keyword, '%'))

			     OR EXISTS (
			            SELECT m.id
			            FROM SaasMedicine m
			            WHERE m.id = s.medicineId
			              AND m.tenantId = :tenantId
			              AND (
			                    LOWER(m.medicineName)
			                        LIKE LOWER(CONCAT('%', :keyword, '%'))

			                 OR LOWER(COALESCE(m.manufacturer, ''))
			                        LIKE LOWER(CONCAT('%', :keyword, '%'))

			                 OR LOWER(COALESCE(m.saltName, ''))
			                        LIKE LOWER(CONCAT('%', :keyword, '%'))
			              )
			     )
			  )
			ORDER BY s.createdAt DESC
			""")
	List<SaasMedicineStock> searchStocks(@Param("tenantId") Long tenantId,

			@Param("keyword") String keyword);

	@Query("""
			SELECT COALESCE(SUM(s.currentQuantity), 0)
			FROM SaasMedicineStock s
			WHERE s.tenantId = :tenantId
			  AND s.medicineId = :medicineId
			  AND s.active = true
			  AND COALESCE(s.currentQuantity, 0) > 0
			  AND (
			        s.expiryDate IS NULL
			        OR s.expiryDate >= :requiredDate
			  )
			""")
	Long sumAvailableQuantityForSale(@Param("tenantId") Long tenantId,

			@Param("medicineId") Long medicineId,

			@Param("requiredDate") java.time.LocalDate requiredDate);

	@Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
	@Query("""
			SELECT s
			FROM SaasMedicineStock s
			WHERE s.id = :stockId
			  AND s.tenantId = :tenantId
			  AND s.active = true
			""")
	Optional<SaasMedicineStock> findStockForUpdate(@Param("stockId") Long stockId,

			@Param("tenantId") Long tenantId);

	List<SaasMedicineStock> findByTenantIdAndActiveTrueOrderByExpiryDateAsc(Long tenantId);

}