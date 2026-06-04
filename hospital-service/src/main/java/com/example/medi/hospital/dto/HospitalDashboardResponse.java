package com.example.medi.hospital.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HospitalDashboardResponse {

    private long totalPatients;
    private long totalStaff;
    private long inventoryItems;
    private long totalBills;

}