package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SaasDashboardReportResponse {

    private Long totalPatients;

    private Long totalDoctors;

    private Long totalStaff;

    private Long totalAppointments;

    private Long pendingAppointments;

    private Long completedAppointments;

    private Long opdVisits;

    private Long activeIpdAdmissions;

    private Long invoices;

    private BigDecimal totalBilling;

    private BigDecimal totalPaid;

    private BigDecimal totalDue;

    private Long pharmacySales;

    private Long lowStockItems;

    private Long labOrders;

    private Long radiologyOrders;
}