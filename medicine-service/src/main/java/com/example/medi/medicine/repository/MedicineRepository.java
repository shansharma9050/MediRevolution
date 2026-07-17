package com.example.medi.medicine.repository;

import com.example.medi.medicine.entity.Medicine;
import com.example.medi.medicine.entity.WholesalerMedicineStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {

	List<Medicine> findAllByOrderByMedicineNameAscBrandNameAsc();

	List<Medicine> findByMedicineNameContainingIgnoreCaseOrBrandNameContainingIgnoreCaseOrderByMedicineNameAscBrandNameAsc(
			String medicineName, String brandName);

	Optional<Medicine> findByMedicineNameIgnoreCaseAndBrandNameIgnoreCaseAndManufacturerIgnoreCase(String medicineName,
			String brandName, String manufacturer);

	Optional<Medicine> findByMedicineNameIgnoreCaseAndBrandNameIgnoreCaseAndManufacturerIgnoreCaseAndIdNot(
			String medicineName, String brandName, String manufacturer, Long id);

	@Query("""
			SELECT m
			FROM Medicine m
			WHERE LOWER(m.medicineName) LIKE LOWER(CONCAT('%', :keyword, '%'))
			   OR LOWER(m.brandName) LIKE LOWER(CONCAT('%', :keyword, '%'))
			   OR LOWER(m.composition) LIKE LOWER(CONCAT('%', :keyword, '%'))
			   OR LOWER(m.manufacturer) LIKE LOWER(CONCAT('%', :keyword, '%'))
			   OR LOWER(m.category) LIKE LOWER(CONCAT('%', :keyword, '%'))
			   OR LOWER(m.medicineType) LIKE LOWER(CONCAT('%', :keyword, '%'))
			ORDER BY m.medicineName ASC, m.brandName ASC
			""")
	List<Medicine> searchMedicineMaster(@Param("keyword") String keyword);

	@Query("""
			SELECT s
			FROM WholesalerMedicineStock s
			JOIN s.medicine m
			WHERE s.active = true
			  AND s.availableQuantity > 0
			  AND (
			        LOWER(m.medicineName) LIKE LOWER(CONCAT('%', :keyword, '%'))
			     OR LOWER(m.brandName) LIKE LOWER(CONCAT('%', :keyword, '%'))
			     OR LOWER(m.composition) LIKE LOWER(CONCAT('%', :keyword, '%'))
			  )
			ORDER BY s.wholesalePrice ASC
			""")
	List<WholesalerMedicineStock> searchAvailableStock(@Param("keyword") String keyword);
}