package com.example.medi.saas.controller;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.service.SaasSalesOrderService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/sales-orders")
public class SaasSalesOrderController {

	private final SaasSalesOrderService orderService;

	public SaasSalesOrderController(SaasSalesOrderService orderService) {
		this.orderService = orderService;
	}

	@GetMapping
	public List<SaasSalesOrderResponse> getOrders(@RequestParam Long tenantId) {

		return orderService.getOrders(tenantId);
	}

	@GetMapping("/search")
	public List<SaasSalesOrderResponse> searchOrders(@RequestParam Long tenantId,

			@RequestParam(required = false) String keyword) {

		return orderService.searchOrders(tenantId, keyword);
	}

	@GetMapping("/summary")
	public SaasSalesOrderSummaryResponse getSummary(@RequestParam Long tenantId) {

		return orderService.getSummary(tenantId);
	}

	@GetMapping("/{orderId}")
	public SaasSalesOrderResponse getOrder(@PathVariable Long orderId,

			@RequestParam Long tenantId) {

		return orderService.getOrder(tenantId, orderId);
	}

	@PostMapping
	public SaasSalesOrderResponse createOrder(@RequestBody SaasSalesOrderRequest request) {

		return orderService.createOrder(request);
	}

	@PutMapping("/{orderId}/confirm")
	public SaasSalesOrderResponse confirmOrder(@PathVariable Long orderId,

			@RequestBody SaasSalesOrderStatusRequest request) {

		return orderService.confirmOrder(orderId, request);
	}

	@PutMapping("/{orderId}/reject")
	public SaasSalesOrderResponse rejectOrder(@PathVariable Long orderId,

			@RequestBody SaasSalesOrderStatusRequest request) {

		return orderService.rejectOrder(orderId, request);
	}

	@PutMapping("/{orderId}/dispatch")
	public SaasSalesOrderResponse dispatchOrder(@PathVariable Long orderId,

			@RequestBody SaasSalesOrderStatusRequest request) {

		return orderService.dispatchOrder(orderId, request);
	}

	@PutMapping("/{orderId}/deliver")
	public SaasSalesOrderResponse deliverOrder(@PathVariable Long orderId,

			@RequestBody SaasSalesOrderStatusRequest request) {

		return orderService.deliverOrder(orderId, request);
	}

	@PutMapping("/{orderId}/cancel")
	public SaasSalesOrderResponse cancelOrder(@PathVariable Long orderId,

			@RequestBody SaasSalesOrderStatusRequest request) {

		return orderService.cancelOrder(orderId, request);
	}

	@PostMapping("/{orderId}/convert-to-sale")
	public SaasSalesOrderResponse convertOrderToSale(@PathVariable Long orderId,

			@RequestBody SaasSalesOrderConvertRequest request) {

		return orderService.convertOrderToSale(orderId, request);
	}
}