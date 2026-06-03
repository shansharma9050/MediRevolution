package com.example.medi.order.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.order.entity.MedicineOrder;
import com.example.medi.order.enums.OrderStatus;

import java.util.List;

public interface MedicineOrderRepository extends JpaRepository<MedicineOrder, Long> {

    List<MedicineOrder> findByRetailerAuthUserId(Long retailerAuthUserId);

    List<MedicineOrder> findByWholesalerAuthUserId(Long wholesalerAuthUserId);

    MedicineOrder findByOrderNumber(String orderNumber);
    
    long countByRetailerAuthUserId(Long retailerAuthUserId);

    long countByWholesalerAuthUserId(Long wholesalerAuthUserId);

    long countByRetailerAuthUserIdAndStatus(Long retailerAuthUserId, OrderStatus status);

    long countByWholesalerAuthUserIdAndStatus(Long wholesalerAuthUserId, OrderStatus status);

    long countByStatus(OrderStatus status);
}