package com.example.medi.order.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockResponse {

    private Long id;
    private Long wholesalerAuthUserId;
    private MedicineResponse medicine;
    private String batchNumber;
    private LocalDate expiryDate;
    private Integer availableQuantity;
    private BigDecimal wholesalePrice;
    private BigDecimal gstPercentage;

   
}
