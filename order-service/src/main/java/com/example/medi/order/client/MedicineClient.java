package com.example.medi.order.client;


import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.example.medi.order.dto.ReduceStockRequest;
import com.example.medi.order.dto.StockResponse;

@FeignClient(name = "medicine-service")
public interface MedicineClient {

    @GetMapping("/medicines/stock/{stockId}")
    StockResponse getStockById(
            @PathVariable Long stockId,
            @RequestHeader("Authorization") String token
    );
    
    @PutMapping("/medicines/stock/{stockId}/reduce")
    StockResponse reduceStock(
            @PathVariable Long stockId,
            @RequestBody ReduceStockRequest request,
            @RequestHeader("Authorization") String token
    );
}
