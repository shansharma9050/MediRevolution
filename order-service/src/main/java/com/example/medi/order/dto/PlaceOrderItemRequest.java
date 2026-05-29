package com.example.medi.order.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlaceOrderItemRequest {

    private Long stockId;
    private Integer quantity;
	/*
	 * private Long medicineId; private String medicineName; private String
	 * batchNumber;
	 */
	/*
	 * private BigDecimal unitPrice; private BigDecimal gstPercentage;
	 */
    
}
