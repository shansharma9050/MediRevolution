package com.example.medi.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Data
@NoArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String invoiceNumber;

    private Long orderId;
    private String orderNumber;
    
    private Long retailerAuthUserId;
    private Long wholesalerAuthUserId;

    private BigDecimal taxableAmount;
    private BigDecimal gstAmount;
    private BigDecimal totalAmount;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<InvoiceItem> items = new java.util.ArrayList<>();

    public java.util.List<InvoiceItem> getItems() {
        return items;
    }

    public void setItems(java.util.List<InvoiceItem> items) {
        this.items = items;
    }
    
    private LocalDateTime invoiceDate = LocalDateTime.now();

    private String status = "GENERATED";

}
