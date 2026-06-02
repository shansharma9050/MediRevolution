package com.example.medi.billing.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.billing.entity.Invoice;

import java.util.Optional;
import java.util.List;


public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByOrderNumber(String orderNumber);
}
