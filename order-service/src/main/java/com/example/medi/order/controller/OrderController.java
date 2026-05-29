package com.example.medi.order.controller;
import org.springframework.web.bind.annotation.*;

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
    public MedicineOrder placeOrder(@RequestBody PlaceOrderRequest request) {
        return orderService.placeOrder(request);
    }

    @GetMapping("/my")
    public Object getMyOrders() {
        return orderService.getMyOrders();
    }

    @PutMapping("/{orderId}/status")
    public MedicineOrder updateOrderStatus(
            @PathVariable Long orderId,
            @RequestParam OrderStatus status
    ) {
        return orderService.updateOrderStatus(orderId, status);
    }
    
    @GetMapping("/{orderId}")
    public MedicineOrder getOrderById(@PathVariable Long orderId) {
        return orderService.getOrderById(orderId);
    }
}