package com.example.medi.order.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "medicine_order_items")
@Data
@NoArgsConstructor
public class MedicineOrderItem {

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

    private BigDecimal lineTotal;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private MedicineOrder order;

   
}