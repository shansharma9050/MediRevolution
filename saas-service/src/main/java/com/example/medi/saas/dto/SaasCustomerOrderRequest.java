package com.example.medi.saas.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class SaasCustomerOrderRequest {
	private Long tenantId;
	private LocalDate expectedDeliveryDate;
	private String shippingAddress;
	private String remarks;
	private List<SaasCustomerOrderItemRequest> items;
}
