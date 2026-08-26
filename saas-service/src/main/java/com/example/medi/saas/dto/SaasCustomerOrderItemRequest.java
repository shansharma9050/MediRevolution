package com.example.medi.saas.dto;

import lombok.Data;

@Data
public class SaasCustomerOrderItemRequest {
	private Long medicineId;
	private Integer quantity;
}
