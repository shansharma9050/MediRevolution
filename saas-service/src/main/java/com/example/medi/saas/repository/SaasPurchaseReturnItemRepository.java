package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasPurchaseReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SaasPurchaseReturnItemRepository
        extends JpaRepository<SaasPurchaseReturnItem, Long> {

    List<SaasPurchaseReturnItem>
    findByTenantIdAndPurchaseReturnIdOrderByIdAsc(
            Long tenantId,
            Long purchaseReturnId
    );

    @Query("""
            SELECT COALESCE(SUM(i.returnQuantity), 0)
            FROM SaasPurchaseReturnItem i,
                 SaasPurchaseReturn r
            WHERE i.purchaseReturnId = r.id
              AND i.tenantId = :tenantId
              AND i.purchaseItemId = :purchaseItemId
              AND r.tenantId = :tenantId
              AND r.returnStatus <>
                  com.example.medi.saas.enums.SaasPurchaseReturnStatus.CANCELLED
            """)
    Long sumReturnedQuantityByPurchaseItem(
            @Param("tenantId")
            Long tenantId,

            @Param("purchaseItemId")
            Long purchaseItemId
    );
}