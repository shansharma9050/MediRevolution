package com.example.medi.medicine.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WholesalerMedicineDashboardResponse {

    private long totalMedicines;
    private long stockItems;
    private long totalQuantity;
    private long lowStockItems;

}
