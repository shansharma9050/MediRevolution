package com.example.medi.order.controller;
import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.example.medi.order.dto.OrderDashboardCountResponse;
import com.example.medi.order.dto.OrderListResponse;
import com.example.medi.order.dto.OrderResponse;
import com.example.medi.order.dto.PlaceOrderRequest;
import com.example.medi.order.entity.MedicineOrder;
import com.example.medi.order.enums.OrderStatus;
import com.example.medi.order.service.OrderService;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public OrderResponse placeOrder(
            @RequestBody PlaceOrderRequest request) {

        MedicineOrder order =
                orderService.placeOrder(request);

        return new OrderResponse(
                order.getId(),
                order.getStatus().name(),
                "Order placed successfully"
        );
    }

    @GetMapping("/my")
    public List<OrderListResponse> getMyOrders() {
        return orderService.getMyOrders();
    }

    @PutMapping("/{orderId}/status")
    public OrderResponse updateOrderStatus(
            @PathVariable Long orderId,
            @RequestParam OrderStatus status
    ) {
        MedicineOrder order = orderService.updateOrderStatus(orderId, status);

        return new OrderResponse(
                order.getId(),
                order.getStatus().name(),
                "Order status updated successfully"
        );
    }
    
    @GetMapping("/{orderNo}")
    public OrderListResponse getOrderByOrderNo(@PathVariable String orderNo) {
        return orderService.getOrderByOrderNo(orderNo);
    }
    
    @GetMapping("/dashboard-counts")
    public OrderDashboardCountResponse getOrderDashboardCounts() {
        return orderService.getOrderDashboardCounts();
    }
}