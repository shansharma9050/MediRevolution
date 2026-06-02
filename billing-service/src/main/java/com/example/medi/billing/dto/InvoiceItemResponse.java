package com.example.medi.billing.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceItemResponse {
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
}