package com.example.medi.billing.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.billing.entity.Invoice;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByOrderId(Long orderId);
}
