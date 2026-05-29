package com.example.medi.order.service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.order.client.MedicineClient;
import com.example.medi.order.client.NotificationClient;
import com.example.medi.order.dto.NotificationRequest;
import com.example.medi.order.dto.PlaceOrderItemRequest;
import com.example.medi.order.dto.PlaceOrderRequest;
import com.example.medi.order.dto.ReduceStockRequest;
import com.example.medi.order.dto.StockResponse;
import com.example.medi.order.entity.MedicineOrder;
import com.example.medi.order.entity.MedicineOrderItem;
import com.example.medi.order.enums.OrderStatus;
import com.example.medi.order.repository.MedicineOrderRepository;
import com.example.medi.order.security.CurrentUserUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class OrderService {

    private final MedicineOrderRepository orderRepository;
    private final MedicineClient medicineClient;
    private final NotificationClient notificationClient;

    public OrderService(
            MedicineOrderRepository orderRepository,
            MedicineClient medicineClient,
            NotificationClient notificationClient
    ) {
        this.orderRepository = orderRepository;
        this.medicineClient = medicineClient;
        this.notificationClient = notificationClient;
    }

    public MedicineOrder placeOrder(PlaceOrderRequest request) {

        if (!CurrentUserUtil.getRole().equals("RETAILER")) {
            throw new AccessDeniedException("Only RETAILER can place order");
        }

        if (request.getWholesalerAuthUserId() == null) {
            throw new RuntimeException("Wholesaler is required");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Order must contain at least one item");
        }

        MedicineOrder order = new MedicineOrder();
        order.setOrderNumber("MR-ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setRetailerAuthUserId(CurrentUserUtil.getUserId());
        order.setWholesalerAuthUserId(request.getWholesalerAuthUserId());
        order.setStatus(OrderStatus.PENDING);

        BigDecimal total = BigDecimal.ZERO;
        String token = CurrentUserUtil.getAuthorizationHeader();

        for (PlaceOrderItemRequest itemRequest : request.getItems()) {

            if (itemRequest.getStockId() == null) {
                throw new RuntimeException("Stock ID is required");
            }

            if (itemRequest.getQuantity() == null || itemRequest.getQuantity() <= 0) {
                throw new RuntimeException("Quantity must be greater than zero");
            }

            StockResponse stock = medicineClient.getStockById(
                    itemRequest.getStockId(),
                    token
            );

            if (stock == null) {
                throw new RuntimeException("Stock not found");
            }

            if (!stock.getWholesalerAuthUserId().equals(request.getWholesalerAuthUserId())) {
                throw new RuntimeException("Selected stock does not belong to selected wholesaler");
            }

            if (stock.getAvailableQuantity() == null || stock.getAvailableQuantity() < itemRequest.getQuantity()) {
                throw new RuntimeException("Insufficient stock for " + stock.getMedicine().getMedicineName());
            }

            if (stock.getExpiryDate() != null && stock.getExpiryDate().isBefore(LocalDate.now())) {
                throw new RuntimeException("Medicine batch is expired: " + stock.getMedicine().getMedicineName());
            }

            BigDecimal unitPrice = stock.getWholesalePrice();
            BigDecimal gst = stock.getGstPercentage() == null
                    ? BigDecimal.ZERO
                    : stock.getGstPercentage();

            BigDecimal baseAmount = unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            BigDecimal gstAmount = baseAmount.multiply(gst).divide(BigDecimal.valueOf(100));
            BigDecimal lineTotal = baseAmount.add(gstAmount);

            MedicineOrderItem item = new MedicineOrderItem();
            item.setStockId(stock.getId());
            item.setMedicineId(stock.getMedicine().getId());
            item.setMedicineName(stock.getMedicine().getMedicineName());
            item.setBatchNumber(stock.getBatchNumber());
            item.setQuantity(itemRequest.getQuantity());
            item.setUnitPrice(unitPrice);
            item.setGstPercentage(gst);
            item.setLineTotal(lineTotal);
            item.setOrder(order);

            order.getItems().add(item);
            total = total.add(lineTotal);
        }

        order.setTotalAmount(total);

        MedicineOrder savedOrder = orderRepository.save(order);

        notificationClient.createNotification(
                new NotificationRequest(
                        savedOrder.getWholesalerAuthUserId(),
                        savedOrder.getRetailerAuthUserId(),
                        "ORDER_PLACED",
                        "New Order Received",
                        "New order " + savedOrder.getOrderNumber() + " has been placed by retailer."
                ),
                token
        );

        return savedOrder;
    }
    
    public MedicineOrder updateOrderStatus(Long orderId, OrderStatus status) {

        MedicineOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String role = CurrentUserUtil.getRole();
        Long currentUserId = CurrentUserUtil.getUserId();

        if (!role.equals("WHOLESALER")) {
            throw new AccessDeniedException("Only WHOLESALER can update order status");
        }

        if (!order.getWholesalerAuthUserId().equals(currentUserId)) {
            throw new AccessDeniedException("You can update only your own orders");
        }

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new RuntimeException("Delivered order status cannot be changed");
        }

        if (status == OrderStatus.DELIVERED) {

            if (order.getStatus() != OrderStatus.SHIPPED && order.getStatus() != OrderStatus.ACCEPTED) {
                throw new RuntimeException("Order must be ACCEPTED or SHIPPED before delivery");
            }

            String token = CurrentUserUtil.getAuthorizationHeader();

            for (MedicineOrderItem item : order.getItems()) {
                medicineClient.reduceStock(
                        item.getStockId(),
                        new ReduceStockRequest(item.getStockId(), item.getQuantity()),
                        token
                );
            }
        }

        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());

        MedicineOrder savedOrder = orderRepository.save(order);

        String title;
        String message;
        String type;

        if (status == OrderStatus.ACCEPTED) {
            type = "ORDER_ACCEPTED";
            title = "Order Accepted";
            message = "Your order " + savedOrder.getOrderNumber() + " has been accepted by wholesaler.";
        } else if (status == OrderStatus.REJECTED) {
            type = "ORDER_REJECTED";
            title = "Order Rejected";
            message = "Your order " + savedOrder.getOrderNumber() + " has been rejected by wholesaler.";
        } else if (status == OrderStatus.DELIVERED) {
            type = "ORDER_DELIVERED";
            title = "Order Delivered";
            message = "Your order " + savedOrder.getOrderNumber() + " has been delivered.";
        } else {
            type = "GENERAL";
            title = "Order Status Updated";
            message = "Your order " + savedOrder.getOrderNumber() + " status changed to " + status.name();
        }

        notificationClient.createNotification(
                new NotificationRequest(
                        savedOrder.getRetailerAuthUserId(),
                        savedOrder.getWholesalerAuthUserId(),
                        type,
                        title,
                        message
                ),
                CurrentUserUtil.getAuthorizationHeader()
        );

        return savedOrder;
    }

    public Object getMyOrders() {

        String role = CurrentUserUtil.getRole();
        Long userId = CurrentUserUtil.getUserId();

        if (role.equals("RETAILER")) {
            return orderRepository.findByRetailerAuthUserId(userId);
        }

        if (role.equals("WHOLESALER")) {
            return orderRepository.findByWholesalerAuthUserId(userId);
        }

        if (role.equals("SUPER_ADMIN")) {
            return orderRepository.findAll();
        }

        throw new AccessDeniedException("You do not have permission to view orders");
    }
    
    public MedicineOrder getOrderById(Long orderId) {
        MedicineOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String role = CurrentUserUtil.getRole();
        Long userId = CurrentUserUtil.getUserId();

        if (role.equals("RETAILER") && !order.getRetailerAuthUserId().equals(userId)) {
            throw new AccessDeniedException("You can view only your own orders");
        }

        if (role.equals("WHOLESALER") && !order.getWholesalerAuthUserId().equals(userId)) {
            throw new AccessDeniedException("You can view only your own orders");
        }

        if (!role.equals("RETAILER") && !role.equals("WHOLESALER") && !role.equals("SUPER_ADMIN")) {
            throw new AccessDeniedException("You do not have permission to view this order");
        }

        return order;
    }
}
