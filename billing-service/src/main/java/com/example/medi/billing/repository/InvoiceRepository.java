package com.example.medi.billing.repository;

import com.example.medi.billing.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

	Optional<Invoice> findByOrderNumber(String orderNumber);

	@Query("""
			    SELECT DISTINCT i
			    FROM Invoice i
			    LEFT JOIN FETCH i.items
			    WHERE i.orderNumber = :orderNumber
			""")
	Optional<Invoice> findByOrderNumberWithItems(@Param("orderNumber") String orderNumber);
}