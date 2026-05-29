package com.example.medi.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_items")
@Data
@NoArgsConstructor
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long stockId;
    private Long medicineId;
    private String medicineName;
    private String batchNumber;

    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal gstPercentage;
    private BigDecimal taxableAmount;
    private BigDecimal gstAmount;
    private BigDecimal lineTotal;

    @ManyToOne
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

}
