package com.example.medi.order.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.medi.order.entity.MedicineOrder;

import java.util.List;

public interface MedicineOrderRepository extends JpaRepository<MedicineOrder, Long> {

    List<MedicineOrder> findByRetailerAuthUserId(Long retailerAuthUserId);

    List<MedicineOrder> findByWholesalerAuthUserId(Long wholesalerAuthUserId);

    MedicineOrder findByOrderNumber(String orderNumber);
}