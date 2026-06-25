package com.example.medi.billing.repository;

import com.example.medi.billing.entity.SubscriptionPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

    Optional<SubscriptionPayment> findByMerchantOrderId(String merchantOrderId);

    List<SubscriptionPayment> findByAuthUserIdOrderByIdDesc(Long authUserId);
}