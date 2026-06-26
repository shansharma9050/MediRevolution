package com.example.medi.medicine.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "wholesaler_medicine_stock")
@Data
@NoArgsConstructor
public class WholesalerMedicineStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long wholesalerAuthUserId;

    @ManyToOne
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    private String batchNumber;

    private LocalDate manufacturingDate;

    private LocalDate expiryDate;

    private Integer availableQuantity;

    private Integer minimumStockLevel;

    private BigDecimal mrp;

    private BigDecimal wholesalePrice;

    private BigDecimal ptr;

    private BigDecimal gstPercentage;

    private boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Transient
    private String wholesalerName;

    @Transient
    private String wholesalerCompanyName;

    @Transient
    private String wholesalerMobile;

    @Transient
    private String wholesalerAddress;

    
}
