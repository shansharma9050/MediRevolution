package com.example.medi.billing.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemResponse {

	 	private Long stockId;
	    private Long medicineId;
	    private String medicineName;
	    private String batchNumber;
	    private Integer quantity;
	    private BigDecimal unitPrice;
	    private BigDecimal gstPercentage;
	    private BigDecimal lineTotal;
}
