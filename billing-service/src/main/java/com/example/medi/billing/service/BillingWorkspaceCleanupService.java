package com.example.medi.billing.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.medi.billing.repository.SubscriptionPaymentRepository;
import com.example.medi.billing.repository.UserSubscriptionRepository;

@Service
public class BillingWorkspaceCleanupService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;

    public BillingWorkspaceCleanupService(
            UserSubscriptionRepository userSubscriptionRepository,
            SubscriptionPaymentRepository subscriptionPaymentRepository) {

        this.userSubscriptionRepository =
                userSubscriptionRepository;

        this.subscriptionPaymentRepository =
                subscriptionPaymentRepository;
    }

    @Transactional
    public void deleteWorkspaceBillingData(Long tenantId) {

        if (tenantId == null || tenantId <= 0) {
            throw new RuntimeException("Valid tenant id is required");
        }

        /*
         * Payments first.
         */
        subscriptionPaymentRepository.deleteByTenantId(tenantId);

        /*
         * Then subscriptions.
         */
        userSubscriptionRepository.deleteByTenantId(tenantId);
    }
}